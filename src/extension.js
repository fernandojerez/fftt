const vscode = require('vscode');
const camaro_utils = require('./camaro_utils');

/**
 * @param {any} args
 */
async function runFFCommand(args){       
    let camaro = camaro_utils.getCamaroBuild(args.fsPath);
    if(camaro){
        const result = await vscode.window.showQuickPick(camaro.options, {
            canPickMany: false,
            placeHolder: "Select task to execute"
        });
        if(result != null){
            let terminal = vscode.window.createTerminal({cwd:camaro.root_dir});
            terminal.show();
            terminal.sendText("gradlew " + result.value.replace(/,/g, " "));
        }        
    }
}

/**
 * @param {Object} args 
 */
async function openKittCommand(args){
    let root = camaro_utils.getKittWorkDir(args.fsPath);
    let options = [
        {
            label: "Local Kitt",
            value: "kitt"
        },
        {
            label: "Remote Kitt",
            value: "kitt -r 9999"
        },
        {
            label: "Upgrade Kitt",
            value: "update_kitt"
        }
    ];
    const result = await vscode.window.showQuickPick(options, {
        canPickMany: false,
        placeHolder: "Select task to execute"
    });
    let terminal = vscode.window.createTerminal({cwd:root});
    terminal.show();
    terminal.sendText(result.value);
}

/**
 * @param {vscode.ExtensionContext} context
 */
exports.activate = (context) => {
    context.subscriptions.push(vscode.commands.registerCommand("ff.commands.run_camaro", runFFCommand));
    context.subscriptions.push(vscode.commands.registerCommand("ff.commands.open_kitt", openKittCommand));
};