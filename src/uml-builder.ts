/// <reference path="typings/graphviz/graphviz.d.ts"/>

import * as graphviz from "graphviz";
import { Element, Module, Class, Method, Property, Visibility, QualifiedName, Lifetime } from "./ts-elements";
import { Collections } from "./extensions";
import * as fs from 'fs';
import * as path from 'path';

export function buildUml(modules: Module[], outputFilename: string, dependenciesOnly: boolean, svgOutput: boolean) {
    let g: graphviz.Graph = graphviz.digraph("G");

    const FontSizeKey = "fontsize";
    const FontSize = 12;
    const FontNameKey = "fontname";
    const FontName = "Verdana";

    // set diagram default styles
    g.set(FontSizeKey, FontSize);
    g.set(FontNameKey, FontName);
    g.setEdgeAttribut(FontSizeKey, FontSize);
    g.setEdgeAttribut(FontNameKey, FontName);
    g.setNodeAttribut(FontSizeKey, FontSize);
    g.setNodeAttribut(FontNameKey, FontName);
    g.setNodeAttribut("shape", "record");

    modules.forEach(module => {
        buildModule(module, g, module.path, 0, dependenciesOnly);
    });

    const pathVariable = <string> process.env["PATH"];
    if (process.platform === "win32") {
        if (pathVariable.indexOf("Graphviz") === -1) {
            console.warn("Could not find Graphviz in PATH.");
        }
    } else {
        // Set GraphViz path (if not in your path)
        pathVariable.split(':').forEach(location => {
            if (fs.existsSync(path.join(location, 'dot'))) {
                g.setGraphVizPath(location);
            }
        });
    }

    // Generate a PNG/SVG output
    g.output(svgOutput ? "svg" : "png", outputFilename);
}

function buildModule(module: Module, g: graphviz.Graph, path: string, level: number, dependenciesOnly: boolean) {
    const ModulePrefix = "cluster_";

    let moduleId = getGraphNodeId(path, module.name);
    let cluster = g.addCluster("\"" + ModulePrefix + moduleId + "\"");

    cluster.set("label", (module.visibility !== Visibility.Public ? visibilityToString(module.visibility) + " " : "") + module.name);
    cluster.set("style", "filled");
    cluster.set("color", "gray" + Math.max(40, (95 - (level * 6))));

    if (dependenciesOnly) {
        Collections.distinct(module.dependencies, d => d.name).forEach(d => {
            g.addEdge(module.name, getGraphNodeId("", d.name));
        });
    } else {
        let moduleMethods = combineSignatures(module.methods, getMethodSignature);
        if (moduleMethods) {
            cluster.addNode(
                getGraphNodeId(path, module.name),
                {
                    "label": moduleMethods,
                    "shape": "none"
                });
        }

        module.modules.forEach(childModule => {
            buildModule(childModule, cluster, moduleId, level + 1, false);
        });

        module.classes.forEach(childClass => {
            buildClass(childClass, cluster, moduleId);
        });
    }
}

function buildClass(classDef: Class, g: graphviz.Graph, path: string) {
    let methodsSignatures = combineSignatures(classDef.methods, getMethodSignature);
    let propertiesSignatures = combineSignatures(classDef.properties, getPropertySignature);

    let classNode = g.addNode(
        getGraphNodeId(path, classDef.name),
        {
            "label": "{" + [ classDef.name, propertiesSignatures, methodsSignatures].filter(e => e.length > 0).join("|") + "}"
        });

    if(classDef.extends) {
        // add inheritance arrow
        g.addEdge(
            classNode,
            classDef.extends.parts.reduce((path, name) => getGraphNodeId(path, name), ""),
            { "arrowhead": "onormal" });
    }

    if (classDef.dependencies) {
        classDef.dependencies.forEach(dependency => {
            g.addEdge(
                classNode,
                dependency.parts.reduce((path, name) => getGraphNodeId(path, name), ""),
                { "arrowhead": "vee" }
            );
        });
    }
}

function combineSignatures<T extends Element>(elements: T[], map: (e: T) => string): string {
    const order = [Visibility.Private, Visibility.Protected, Visibility.Public];
    const sortedElements: T[] = [];
    // the following algorithm to sort is not optimal
    order.forEach((visibility) => {
        elements.forEach((element) => {
            if (element.visibility === visibility) {
                sortedElements.push(element);
            }
        });
    });
    return sortedElements.map(e => map(e) + "\\l").join("");
}

function getMethodSignature(method: Method): string {
    return [
        visibilityToString(method.visibility),
        lifetimeToString(method.lifetime),
        getName(method) + "()"
    ].join(" ");
}

function getPropertySignature(property: Property): string {
    return [
        visibilityToString(property.visibility),
        lifetimeToString(property.lifetime),
        [
            (property.hasGetter ? "get" : null),
            (property.hasSetter ? "set" : null)
        ].filter(v => v !== null).join("/"),
        getName(property)
    ].join(" ");
}

function visibilityToString(visibility: Visibility) {
    switch(visibility) {
        case Visibility.Public:
            return "+";
        case Visibility.Protected:
            return "~";
        case Visibility.Private:
            return "-";
    }
}

function lifetimeToString(lifetime: Lifetime) {
    return lifetime === Lifetime.Static ? "\\<static\\>" : "";
}

function getName(element: Element) {
    return element.name;
}

function getGraphNodeId(path: string, name: string): string {
    let result = ((path ? path + "/" : "") + name).replace(/\//g, "|");
    return result;
}