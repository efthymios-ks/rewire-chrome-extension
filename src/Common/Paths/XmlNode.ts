export interface XmlNode {
    name: string;
    attributes: Record<string, string>;
    text: string;
    children: XmlNode[];
}
