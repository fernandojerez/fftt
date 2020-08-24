const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
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
    return {root_dir, options};
}

/**
 * @param {string} fsPath 
 */
exports.getKittWorkDir = function(fsPath){
    return getDirectory(fsPath);
}

exports.runKitt = function({workdir, cmd}){
    let tm = new Date().getTime();
    let terminal = vscode.window.createTerminal({cwd: workdir});
    terminal.show();
    const fcmd = cmd.replace(/\r/g, "").replace(/\n/g, `[[${tm}]]`);
    terminal.sendText(`kitt -e "${cmd}" -nl "[[${tm}]]"`);
}