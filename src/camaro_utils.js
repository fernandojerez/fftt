const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const os = require('os');


/**
 * @param {string} fsPath 
 */
function getDirectory(fsPath) {
    if (fs.lstatSync(fsPath).isDirectory()) {
        return fsPath;
    } else {
        return path.dirname(fsPath);
    }
}

/**
 * @param {string} fsPath 
 */
function getCamaroBuildFile(fsPath) {
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
}

/**
 * @param {String} prefix
 * @param {Array} result 
 * @param {Object} input 
 */
function flatMenu(prefix, result, input) {
    for (let key in input) {
        const value = input[key];
        if (!value) continue;
        if (value == '@exclude') continue;
        if (typeof value == 'string') {
            result.push({
                label: prefix + key,
                value
            });
        } else {
            flatMenu(prefix + key + " > ", result, value);
        }
    }
}

/** 
 * @param {string} fsPath 
 */
exports.getCamaroBuild = (fsPath) => {
    let file = getCamaroBuildFile(fsPath);
    if (!file) return null;
    let root_dir = path.dirname(file);
    let content = fs.readFileSync(file, { encoding: 'utf-8' });
    let camaro = JSON.parse(content);

    let menu_cfg = camaro.menu || {};
    let custom_menu = camaro.custom_menu || {};
    let final_menu = { ...menu_cfg, ...custom_menu };

    let options = [];
    flatMenu("", options, final_menu);
    options.sort((a, b) => a.label == b.label ? 0 : a.label < b.label ? -1 : 1);
    return { root_dir, options };
}

/**
 * @param {string} fsPath 
 */
exports.getKittWorkDir = function (fsPath) {
    return getDirectory(fsPath);
}

/**
 * 
 * @param {String} workdir 
 * @param {String} cmd 
 */
exports.runKitt = function (workdir, cmd) {
    let tm = new Date().getTime();
    let terminal = vscode.window.createTerminal({ cwd: workdir });
    terminal.show();
    const fcmd = cmd.replace(/\r/g, "").replace(/\n/g, `[[${tm}]]`);
    terminal.sendText(`kitt -e "${cmd}" -nl "[[${tm}]]"`);
}

/**
 * 
 * @param {String} workdir 
 * @param {String} cmd 
 */
exports.runGradle = function (workdir, cmd) {
    if (cmd == '@exclude') {
        return;
    }

    let enableDebug = false;    
    if (cmd.startsWith("@")) {
        cmd = "debug_on," + cmd.substring(1);
        enableDebug = true;
    }

    let FF_BUILD_DIR = process.env.FF_BUILD_DIR;
    if (FF_BUILD_DIR == null) {
        vscode.window.showErrorMessage("The property or enviroment variable FF_BUILD_DIR is not configured");
        return;
    }

    let FF_JAVA_HOME = process.env.FF_JAVA_HOME;
    let jvmHomeArg = "";
    if(FF_JAVA_HOME){
        jvmHomeArg = `-Dorg.gradle.java.home="${FF_JAVA_HOME}"`;
    }

    let jvmArgs = "-Xmx1024M -Dfile.encoding=UTF-8"
    if(os.platform() == 'darwin'){
        jvmArgs +=" -XstartOnFirstThread";
    }
    if(enableDebug){
        jvmArgs += " -Xdebug";
        jvmArgs += " -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=2018"
    }
    jvmArgs = `-Dorg.gradle.jvmargs="${jvmArgs}"`

    let gradleDir = path.join(FF_BUILD_DIR, path.basename(workdir), ".gradle");
    fs.mkdirSync(gradleDir, { recursive: true });

    let gradleUserHome = path.join(FF_BUILD_DIR, path.basename(workdir), ".gradle_home");
    fs.mkdirSync(gradleUserHome, { recursive: true });

    let terminal = vscode.window.createTerminal({ cwd: workdir });
    terminal.show();

    let fcmd = `gradlew ${cmd.replace(/,/g, " ")} --stacktrace --project-cache-dir="${gradleDir}" --gradle-user-home="${gradleUserHome}" ${jvmHomeArg} ${jvmArgs}`
    terminal.sendText(fcmd);
}