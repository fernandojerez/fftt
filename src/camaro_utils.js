const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const os = require("os");

/**
 * return the first directory in the path
 * @param {string} fsPath
 */
const getDirectory = (fsPath) => {
  if (fs.lstatSync(fsPath).isDirectory()) {
    return fsPath;
  } else {
    return path.dirname(fsPath);
  }
};

/**
 * find the camaro.json file inside the project structure starting from the selected element
 * @param {string} fsPath
 */
const getCamaroBuildFile = (fsPath) => {
  const root = path.parse(fsPath).root;
  let rdir = getDirectory(fsPath);
  do {
    if (rdir == root) {
      return null;
    }
    let file = path.join(rdir, "camaro.json");
    if (fs.existsSync(file)) return file;
    rdir = path.dirname(rdir);
  } while (true);
};

/**
 * @param {String} prefix
 * @param {Array} result
 * @param {Object} input
 */
const flatMenu = (prefix, result, input) => {
  for (let key in input) {
    const value = input[key];
    if (!value) continue;
    if (value == "@exclude") continue;
    if (typeof value == "string") {
      result.push({
        label: prefix + key,
        value,
      });
    } else {
      flatMenu(prefix + key + " > ", result, value);
    }
  }
};

/**
 * Execute the command in the first terminal
 *
 * @param {String} workdir
 * @param {String} command
 * @param {Boolean?} reuse
 */
const runInTerminal = (workdir, name, command, reuse) => {
  const terminal = !reuse
    ? vscode.window.createTerminal({ cwd: workdir, name: `${name} @Not Reuse` })
    : vscode.window.terminals.find((t) => !t.name.endsWith(" @Not Reuse")) ||
      vscode.window.createTerminal({ cwd: workdir, name: name });
  terminal.show();
  terminal.sendText(command);
};

/**
 * @param {string} fsPath
 */
exports.getCamaroBuild = (fsPath) => {
  let file = getCamaroBuildFile(fsPath);
  if (!file) return null;
  let root_dir = path.dirname(file);
  let content = fs.readFileSync(file, { encoding: "utf-8" });
  let camaro = JSON.parse(content);

  let menu_cfg = camaro.menu || {};
  let custom_menu = camaro.custom_menu || {};
  let final_menu = { ...menu_cfg, ...custom_menu };

  let options = [];
  flatMenu("", options, final_menu);
  options.sort((a, b) => {
    if (a.label === b.label) return 0;
    if (a.label < b.label) return -1;
    return 1;
  });
  return { root_dir, options };
};

/**
 * @param {string} fsPath
 */
exports.getKittWorkDir = (fsPath) => {
  return getDirectory(fsPath);
};

/**
 *
 * @param {String} workdir
 * @param {String} name
 * @param {String} cmd
 * @param {String} args
 */
exports.runKitt = function (workdir, name, cmd, args, reuse) {
  let tm = new Date().getTime();
  let terminal = vscode.window.createTerminal({ cwd: workdir });
  terminal.show();
  const fcmd = cmd.trim().replace(/\r/g, "").replace(/\n/g, `[[${tm}]]`);
  runInTerminal(
    workdir,
    name,
    `kitt ${args || ""} -e "${fcmd}" -nl "[[${tm}]]"`,
    reuse
  );
};

/**
 *
 * @param {String} workdir
 * @param {String} cmd
 */
exports.runGradle = function (workdir, name, cmd) {
  if (cmd == "@exclude") {
    return;
  }

  if (cmd.startsWith("shell:")) {
    runInTerminal(workdir, name, cmd.substring("shell:".length), true);
    return;
  }

  if (cmd.startsWith("shell_new:")) {
    runInTerminal(workdir, name, cmd.substring("shell_new:".length), false);
    return;
  }

  const FF_BUILD_DIR = process.env.FF_BUILD_DIR;
  if (FF_BUILD_DIR == null) {
    vscode.window.showErrorMessage(
      "The property or enviroment variable FF_BUILD_DIR is not configured"
    );
    return;
  }

  let enableDebug = false;
  if (cmd.startsWith("@")) {
    cmd = "debug_on," + cmd.substring(1);
    enableDebug = true;
  }

  const FF_JAVA_HOME = process.env.FF_JAVA_HOME;
  const jvmHomeArg = FF_JAVA_HOME
    ? `-Dorg.gradle.java.home="${FF_JAVA_HOME}"`
    : "";
  const jvmArgsParts = ["-Xmx1024M -Dfile.encoding=UTF-8"];
  if (os.platform() == "darwin") {
    jvmArgsParts.push("-XstartOnFirstThread");
  }
  if (enableDebug) {
    jvmArgsParts.push("-Xdebug");
    jvmArgsParts.push(
      "-Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=2018"
    );
  }
  const jvmArgs = `-Dorg.gradle.jvmargs="${jvmArgsParts.join(" ")}"`;

  const gradleDir = path.join(FF_BUILD_DIR, path.basename(workdir), ".gradle");
  fs.mkdirSync(gradleDir, { recursive: true });

  const gradleUserHome = path.join(
    FF_BUILD_DIR,
    path.basename(workdir),
    ".gradle_home"
  );
  fs.mkdirSync(gradleUserHome, { recursive: true });

  const fcmd = `gradlew ${cmd.replace(
    /,/g,
    " "
  )} --stacktrace --project-cache-dir="${gradleDir}" --gradle-user-home="${gradleUserHome}" ${jvmHomeArg} ${jvmArgs}`;
  runInTerminal(workdir, name, fcmd, true);
};

exports.runInTerminal = runInTerminal;
