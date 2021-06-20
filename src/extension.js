const vscode = require("vscode");
const camaro_utils = require("./camaro_utils");

/**
 * Show camaro commands and execute the command selected by the user
 * @param {any} args
 */
const runFFCommand = async (args) => {
  let camaro = camaro_utils.getCamaroBuild(args.fsPath);
  if (camaro) {
    const result = await vscode.window.showQuickPick(camaro.options, {
      canPickMany: false,
      placeHolder: "Select task to execute",
    });
    if (result != null) {
      camaro_utils.runGradle(camaro.root_dir, result.label, result.value);
    }
  }
};

/**
 * Kitt related operations
 * @param {Object} args
 */
const openKittCommand = async (args) => {
  let root = camaro_utils.getKittWorkDir(args.fsPath);
  let options = [
    {
      label: "Local Kitt",
      value: "kitt --env=KITT_WORKDIR=.",
    },
    {
      label: "Remote Kitt",
      value: "kitt -r 9999 --env=KITT_WORKDIR=.",
    },
    {
      label: "Upgrade Kitt",
      value: "update_kitt",
    },
  ];
  const result = await vscode.window.showQuickPick(options, {
    canPickMany: false,
    placeHolder: "Select task to execute",
  });
  camaro_utils.runInTerminal(
    root,
    result.label,
    result.value,
    result.value === "update_kitt"
  );
};

/**
 * Start a tundra project
 * @param {Object} args
 */
const openTundraCommand = async (args) => {
  let root =
    process.env.KITT_WORKDIR || camaro_utils.getKittWorkDir(args.fsPath);
  let options = [
    {
      label: "Start Tundra",
      value: `
            add_import > :tundra
            tundra:start_ide
            leave_terminal_open`,
      key: "start",
    },
    {
      label: "Stop Tundra",
      value: `
            add_import > :tundra
            tundra:stop_ide`,
      key: "stop",
    },
    {
      label: "Open Tundra",
      value: "open_tundra",
      key: "open",
    },
  ];
  const result = await vscode.window.showQuickPick(options, {
    canPickMany: false,
    placeHolder: "Select task to execute",
  });
  switch (result.key) {
    case "start":
      camaro_utils.runKitt(root, result.label, result.value, "-r 9999", false);
      break;
    case "stop":
      camaro_utils.runKitt(root, result.label, result.value, null, true);
      break;
    case "open":
      let panel = vscode.window.createWebviewPanel(
        "tundra",
        "Tundra",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );
      panel.webview.html = `<!DOCTYPE html>
            <html lang="en"">
            <head>
                <meta charset="UTF-8">
                <title>Tundra</title>
                <style>
                    * { nargin: 0; padding: 0 border: none; box-sizing: border-box; }
                    iframe { border: none; background: white; width: 98vw; height:99vh}
                </style>
            </head>
            <body>
                <iframe src="http://localhost:8080"></iframe>
            </body>
            </html>`;
      break;
  }
};

/**
 * Create a FF project
 * @param {Object} args
 */
const createFFProject = async (args) => {
  let root = camaro_utils.getKittWorkDir(args.fsPath);
  let options = [
    {
      label: "Java",
      value: "java",
    },
    {
      label: "Multiple Language",
      value: "multi",
    },
    {
      label: "Multiple UI",
      value: "multi_ui",
    },
    {
      label: "Mustang",
      value: "mustang",
    },
  ];
  const result = await vscode.window.showQuickPick(options, {
    canPickMany: false,
    placeHolder: "Select project type",
  });
  camaro_utils.runKitt(
    root,
    result.name,
    `add_import > :camaro 
     camaro:create_project > :${result.value}`,
    null,
    true
  );
};

/**
 * @param {vscode.ExtensionContext} context
 */
exports.activate = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("ff.commands.run_camaro", runFFCommand)
  );
  //context.subscriptions.push(vscode.commands.registerCommand("ff.commands.open_kitt", openKittCommand));
  //context.subscriptions.push(vscode.commands.registerCommand("ff.commands.open_tundra", openTundraCommand));
  //context.subscriptions.push(vscode.commands.registerCommand("ff.commands.create_project", createFFProject));
};
