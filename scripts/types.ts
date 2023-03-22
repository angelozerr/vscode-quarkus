import { Uri } from "vscode";

 interface SimulationNodeDatum {
  /**
   * Node’s zero-based index into nodes array. This property is set during the initialization process of a simulation.
   */
  index?: number | undefined;
  /**
   * Node’s current x-position
   */
  x?: number | undefined;
  /**
   * Node’s current y-position
   */
  y?: number | undefined;
  /**
   * Node’s current x-velocity
   */
  vx?: number | undefined;
  /**
   * Node’s current y-velocity
   */
  vy?: number | undefined;
  /**
   * Node’s fixed x-position (if position was fixed)
   */
  fx?: number | null | undefined;
  /**
   * Node’s fixed y-position (if position was fixed)
   */
  fy?: number | null | undefined;
}

interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> {
  /**
   * Link’s source node.
   * For convenience, a link’s source and target properties may be initialized using numeric or string identifiers rather than object references; see link.id.
   * When the link force is initialized (or re-initialized, as when the nodes or links change), any link.source or link.target property which is not an object
   * is replaced by an object reference to the corresponding node with the given identifier.
   * After initialization, the source property represents the source node object.
   */
  source: NodeDatum | string | number;
  /**
   * Link’s source link
   * For convenience, a link’s source and target properties may be initialized using numeric or string identifiers rather than object references; see link.id.
   * When the link force is initialized (or re-initialized, as when the nodes or links change), any link.source or link.target property which is not an object
   * is replaced by an object reference to the corresponding node with the given identifier.
   * After initialization, the target property represents the target node object.
   */
  target: NodeDatum | string | number;
  /**
   * The zero-based index into the links array. Internally generated when calling ForceLink.links(...)
   */
  index?: number | undefined;
}


export enum NodeType {
  Template = 0,
  JavaMethod = 1
}

export interface IWebviewMessage {
  [key: string]: unknown;
}

/** Describes the structure of the object returned by `acquireVsCodeApi()`. */
export interface IVSCode {
  postMessage(message: IWebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

export interface IQuteNode {
  id: string;
  name: string;
  type: NodeType;
}

export interface IQuteLink {
  source: number;
  target: number;
  labels: Array<{ content: string; class?: string }>;
}

export interface IQuteGraphData {
  nodes: IQuteNode[];
  links: IQuteLink[];
}

export interface IQuteGraphRendererData {
  uri: Uri;
  ruleName?: string;
  maxLabelCount: number;
  graphData?: IQuteGraphData;
  initialScale: number;
  initialTranslation: { x?: number; y?: number };
}

export interface IQuteGraphLayoutNode extends SimulationNodeDatum, IQuteNode {
  width?: number;
  endX?: number;
  endY?: number;
}

export interface IQuteGraphLayoutLink extends SimulationLinkDatum<IQuteGraphLayoutNode> {
  type: NodeType;
  labels: Array<{ content: string; class?: string }>;
}

export interface IQuteStatePosition {
  translation: { x: number | undefined; y: number | undefined };
  statePositions: {
    [key: number]: IQuteStatePosition;
  };
}
