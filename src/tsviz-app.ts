import * as tsviz from "./tsviz";
import * as path from "path";

function main(args: string[]) {
    let switches = args.filter(a => a.indexOf("-") === 0);
    let nonSwitches = args.filter(a => a.indexOf("-") !== 0);

    if (nonSwitches.length < 1) {
        console.error(
            "Invalid number of arguments. Usage:\n" +
            "  <switches> <sources filename/directory> <output.png>\n" +
            "Available switches:\n" +
            "  -d, dependencies: produces the modules' dependencies diagram\n" +
            "  -r, recursive: include files in subdirectories (must be non-cyclic)" +
            "  -svg: output an svg file");
        return;
    }

    let targetPath = nonSwitches.length > 0 ? nonSwitches[0] : "";
    targetPath = path.resolve(targetPath);
    let outputFilename = nonSwitches.length > 1 ? nonSwitches[1] : "diagram.png";

    let dependenciesOnly = switches.indexOf("-d") >= 0 || switches.indexOf("-dependencies") >= 0; // dependencies or uml?
    let recursive = switches.indexOf("-r") >= 0 || switches.indexOf("-recursive") >= 0;
    let svgOutput = switches.indexOf("-svg") >= 0;

    tsviz.createGraph(targetPath, outputFilename, dependenciesOnly, recursive, svgOutput);

    console.log("Done");
}

export function run() {
    main(process.argv.slice(2));
}
