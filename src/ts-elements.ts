
export enum Visibility {
    Private,
    Public,
    Protected
}

export enum Lifetime {
    Static,
    Instance
}

let ModuleTypeName = "";
let ClassTypeName = "";
let MethodTypeName = "";
let PropertyTypeName = "";
let ImportedModuleTypeName = "";

export class QualifiedName {
    private nameParts: string[];

    constructor(nameParts: string[]) {
        this.nameParts = nameParts;
    }

    public get parts(): string[] {
        return this.nameParts;
    }

    public get name(): string {
        const size = this.nameParts.length;
        return this.nameParts[size - 1]; // last item
    }

    public get fullName(): string {
        return this.nameParts.join('.');
    }
}

export abstract class Element {
    constructor(private _name: string, private _parent: Element, private _visibility: Visibility = Visibility.Public, private _lifetime: Lifetime = Lifetime.Instance) { }

    public get name(): string {
        return this._name;
    }

    public get visibility() : Visibility {
        return this._visibility;
    }

    public get lifetime() : Lifetime {
        return this._lifetime;
    }

    public get parent() : Element {
        return this._parent;
    }

    public addElement(element: Element) {
        this.getElementCollection(element).push(element);
    }

    protected getElementCollection(element: Element) : Array<Element> {
        throw new Error(typeof element + " not supported in " + typeof this);
    }
}

export class Module extends Element {
    private _classes: Class[] = new Array<Class>();
    private _modules: Module[] = new Array<Module>();
    private _dependencies: ImportedModule[] = new Array<ImportedModule>();
    private _methods = new Array<Method>();
    private _path: string;

    public get classes(): Array<Class> {
        return this._classes;
    }

    public get modules(): Array<Module> {
        return this._modules;
    }

    public get dependencies(): Array<ImportedModule> {
        return this._dependencies;
    }

    public get methods(): Array<Method> {
        return this._methods;
    }

    public get path(): string {
        return this._path;
    }

    public set path(value: string) {
        this._path = value;
    }

    protected getElementCollection(element: Element) : Array<Element> {
        switch((<any>element.constructor).name) {
            case ClassTypeName:
                return this.classes;
            case ModuleTypeName:
                return this.modules;
            case ImportedModuleTypeName:
                return this.dependencies;
            case MethodTypeName:
                return this.methods;
        }
        return super.getElementCollection(element);
    }
}

export class Class extends Element {
    private _methods = new Array<Method>();
    private _properties : { [name: string ] : Property } = {};
    private _extends: QualifiedName;

    public get methods(): Array<Method> {
        return this._methods;
    }

    public get properties(): Array<Property> {
        var result = new Array<Property>();
        for (let prop of Object.keys(this._properties)) {
            result.push(this._properties[prop]);
        }
        return result;
    }

    public get dependencies(): Array<QualifiedName> {
        const deps = this.properties.map(p => p.type);
        const uniqueDeps = new Map<string, QualifiedName>();
        deps.forEach(dep => {
            // loop to get rid of duplicate dependencies.
            const key = dep.fullName;
            uniqueDeps.set(key, dep);
        });
        return [...uniqueDeps.values()];
    }

    protected getElementCollection(element: Element) : Array<Element> {
        if (element instanceof Method) {
            return this.methods;
        }
        return super.getElementCollection(element);
    }

    public addElement(element: Element) {
        if(element instanceof Property) {
            let property = <Property> element;
            let existingProperty = this._properties[property.name];
            if (existingProperty) {
                existingProperty.hasGetter = existingProperty.hasGetter || property.hasGetter;
                existingProperty.hasSetter = existingProperty.hasSetter || property.hasSetter;
            } else {
                this._properties[property.name] = property;
            }
            return;
        }
        this.getElementCollection(element).push(element);
    }

    public get extends(): QualifiedName {
        return this._extends;
    }

    public set extends(extendingClass: QualifiedName) {
        this._extends = extendingClass;
    }
}

export class Method extends Element {
    private _returnType: QualifiedName;
    private _argumentTypes = new Array<QualifiedName>();

    public get returnType(): QualifiedName {
        return this._returnType;
    }

    public set returnType(value: QualifiedName) {
        this._returnType = value;
    }

    public get argumentTypes(): Array<QualifiedName> {
        return this._argumentTypes;
    }

    public set argumentTypes(value: Array<QualifiedName>) {
        this._argumentTypes = value;
    }
}

export class ImportedModule extends Element {

}

export class Property extends Element {
    private _hasGetter: boolean;
    private _hasSetter: boolean;
    private _type: QualifiedName;

    public get hasGetter(): boolean {
        return this._hasGetter;
    }

    public set hasGetter(value: boolean) {
        this._hasGetter = value;
    }

    public get hasSetter(): boolean {
        return this._hasSetter;
    }

    public set hasSetter(value: boolean) {
        this._hasSetter = value;
    }

    public get type(): QualifiedName {
        return this._type;
    }

    public set type(value: QualifiedName) {
        this._type = value;
    }
}

function typeName(_class: any) {
    return _class.prototype.constructor.name
}

ModuleTypeName = typeName(Module);
ClassTypeName = typeName(Class);
MethodTypeName = typeName(Method);
PropertyTypeName = typeName(Property);
ImportedModuleTypeName = typeName(ImportedModule);
