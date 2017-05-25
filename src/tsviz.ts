import { readdirSync, lstatSync, existsSync, statSync } from "fs";
import * as path from 'path';
import * as ts from "typescript";
import { Module } from "./ts-elements";
import * as analyser from "./ts-analyser";
import * as umlBuilder from "./uml-builder";
import { flatten } from './util';

export interface OutputModule {
	name: string;
	dependencies: string[];
}

function walk(dir: string, recursive: boolean): string[] {
    /* Source: http://stackoverflow.com/a/5827895 */
    const list = readdirSync(dir);
    const results = list.map((item) => {
        const itemFullPath = path.join(dir, item);
        const stat = lstatSync(itemFullPath);
        if (stat.isFile()) {
            // if it's a file, include it
            return itemFullPath;
        } else {
            // otherwise recursively walk the directory
            return walk(itemFullPath, recursive);
        }
    });
    return flatten(results);
}

function getFiles(targetPath: string, recursive: boolean): string[] {
    if (!existsSync(targetPath)) {
        console.error("'" + targetPath + "' does not exist");
        return [];
    }

    let fileNames: string[];
    if (lstatSync(targetPath).isDirectory()) {
        fileNames = walk(targetPath, recursive);
    } else {
        fileNames = [targetPath];
    }

    return fileNames;
}

function getModules(targetPath: string, recursive: boolean): Module[] {
    let originalDir = process.cwd();
    let fileNames = getFiles(targetPath, recursive);
    const compilerOptions: ts.CompilerOptions = {
        noEmitOnError: true,
        noImplicitAny: true,
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.AMD
    };

    // analyse sources
    let compilerHost = ts.createCompilerHost(compilerOptions, /*setParentNodes */ true);
    let program = ts.createProgram(fileNames, compilerOptions, compilerHost);
    let modules = program.getSourceFiles()
        .filter(f => f.fileName.lastIndexOf(".d.ts") !== f.fileName.length - ".d.ts".length)
        .map(sourceFile => analyser.collectInformation(program, sourceFile));

    process.chdir(originalDir); // go back to the original dir

    console.log("Found " + modules.length + " module(s)");

    return modules;
}

export function createGraph(targetPath: string, outputFilename: string, dependenciesOnly: boolean, recursive: boolean, svgOutput: boolean) {
    let modules = getModules(targetPath, recursive);
    umlBuilder.buildUml(modules, outputFilename, dependenciesOnly, svgOutput);
}

export function getModulesDependencies(targetPath: string, recursive: boolean): OutputModule[] {
    let modules = getModules(targetPath, recursive);
    let outputModules: OutputModule[] = [];
    modules.sort((a, b) => a.name.localeCompare(b.name)).forEach(module => {
        let uniqueDependencies: { [name: string]: string } = {};
        module.dependencies.forEach(dependency => {
            uniqueDependencies[dependency.name] = null;
        });
        outputModules.push({
            name: module.name,
            dependencies: Object.keys(uniqueDependencies).sort()
        });
    });
    return outputModules;
}