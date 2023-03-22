import * as d3 from 'd3';
import { IQuteGraphData, IQuteGraphLayoutNode, IQuteGraphLayoutLink, IQuteGraphRendererData, IQuteLink, IQuteNode, IVSCode, NodeType } from "./types";

type QuteNodeSelection = d3.Selection<SVGElement, IQuteGraphLayoutNode, SVGElement, IQuteGraphData>;
type QuteLinkSelection = d3.Selection<SVGLineElement, IQuteLink, SVGElement, IQuteGraphData>;
type QuteTextSelection = d3.Selection<SVGTextElement, IQuteNode, SVGGElement, IQuteGraphData>;
type QuteLinkTextSelection = d3.Selection<SVGTextElement, IQuteGraphLayoutLink, SVGGElement, IQuteGraphData>;

export class QuteProjectGraphRenderer {

  private static readonly gridSize = 20;

  private svg: d3.Selection<SVGElement, IQuteGraphData, HTMLElement, unknown>;
  private topGroup: d3.Selection<SVGElement, IQuteGraphData, HTMLElement, unknown>;
  private zoom: d3.ZoomBehavior<SVGElement, IQuteGraphData>;
  private figures: QuteNodeSelection;
  private lines: QuteLinkSelection;
  private textSelection: QuteTextSelection;
  private descriptions: QuteTextSelection;
  private linkLabels: QuteLinkTextSelection;
  private simulation: d3.Simulation<IQuteGraphLayoutNode, undefined>;

  private currentNodes?: IQuteGraphLayoutNode[];

  public constructor(private vscode: IVSCode) {
    this.svg = d3.select<SVGElement, IQuteGraphData>("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("version", "1.1")
      .attr("width", "100%"); // Height is determined by the flex layout.

    this.zoom = d3.zoom<SVGElement, IQuteGraphData>()
      .scaleExtent([0.15, 3])
      .on("zoom", (e: d3.D3ZoomEvent<SVGElement, IQuteGraphData>) => {
        this.topGroup.attr("transform", e.transform.toString());
      });

    // Register a listener for data changes.
    // TODO
    /*window.addEventListener("message", (event: MessageEvent<IATNGraphUpdateMessageData>) => {
        if (event.data.command === "updateATNTreeData") {
            this.render(event.data.graphData);
        }
    });*/
  }

  public render(data: IQuteGraphRendererData): void {
    if (!data.graphData) {
      const label = document.createElement("label");
      label.classList.add("noData");
      label.innerText = "No ATN data found (code generation must run at least once in internal or external mode)";

      if (this.topGroup) {
        this.topGroup.remove();
      }

      document.body.appendChild(label);
      this.svg.style("display", "none");

      return;
    }

    // If we have data, remove any previous message we printed.
    let labels = document.body.getElementsByClassName("noData");
    while (labels.length > 0) {
      labels.item(0)?.remove();
    }

    labels = document.body.getElementsByClassName("noSelection");
    while (labels.length > 0) {
      labels.item(0)?.remove();
    }

    this.svg.style("display", "block");

    //this.uri = data.uri;
    //this.ruleName = data.ruleName;

    //this.maxLabelCount = data.maxLabelCount;
    this.currentNodes = data.graphData.nodes as IQuteGraphLayoutNode[];
    const links = data.graphData.links;

    this.topGroup = this.svg.select(".topGroup");
    this.topGroup.remove();
    this.topGroup = this.svg.append("g").classed("topGroup", true);

    const xTranslate = data.initialTranslation.x ?? (this.svg.node()?.clientWidth ?? 0) / 2;
    const yTranslate = data.initialTranslation.y ?? (this.svg.node()?.clientHeight ?? 0) / 2;
    this.svg.call(this.zoom)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      .call(this.zoom.transform, d3.zoomIdentity
        .scale(data.initialScale ?? 0.5)
        .translate(xTranslate, yTranslate))
      .on("dblclick.zoom", null);


    const statesHost = this.topGroup.append("g").classed("statesHost", true);
    const stateElements = statesHost.selectAll().data(this.currentNodes);
    stateElements.enter().append<SVGElement>((node) => {
      let s;
      let element;

      let cssClass = "state "; // + stateType[node.type].short;
      const recursive = node.name === data.ruleName;
      if (recursive) {
        cssClass += " recursive";
      }

      const a = 2;
      if (s == null) {
        element = null;
        s = null;
      }
      if (node.type === NodeType.Template) {
        element = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        s = d3.select<SVGElement, IQuteGraphLayoutNode>(element)
          .attr("width", 50) // Size and offset are updated below, depending on label size.
          .attr("height", 50)
          .attr("y", -25)
          .attr("rx", 5)
          .attr("ry", recursive ? 20 : 5)
          .attr("class", cssClass)
          /*.on("dblclick", this.doubleClicked)
          .call(d3.drag()
            .on("start", this.dragStarted)
            .on("drag", this.dragged),
          )*/;
      }
      else {
        element = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        s = d3.select<SVGElement, IQuteGraphLayoutNode>(element)
          .attr("r", 30)
          .attr("class", cssClass)
          /*.on("dblclick", this.doubleClicked)
          .call(d3.drag()
            .on("start", this.dragStarted)
            .on("drag", this.dragged),
          )*/;
      }

      s.append("title").text(node.name); //stateType[node.type].long);

      return element;
    });

    this.figures = statesHost.selectAll<SVGElement, IQuteGraphLayoutNode>(".state").data(this.currentNodes);

    const textHost = this.topGroup.append("g").classed("textHost", true);
    this.textSelection = textHost.selectAll("text")
      .data(this.currentNodes)
      .enter().append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("class", "stateLabel")
      .text((d) => {
        return d.name;
      });

    // Go through all rect elements and resize/offset them according to their label sizes.
    const textNodes = this.textSelection.nodes();
    const rectNodes = this.figures.nodes();

    const border = 20;
    for (let i = 0; i < textNodes.length; ++i) {
      if (this.currentNodes[i].type === NodeType.Template) {
        const element = textNodes[i];
        let width = Math.ceil(element.getComputedTextLength());
        if (width < 70) {
          width = 70;
        }
        width += border;
        const rect = rectNodes[i];
        rect.setAttribute("width", `${width}px`);
        rect.setAttribute("x", `${-width / 2}px`);

        this.currentNodes[i].width = width;
      }
    }

    const descriptionHost = this.topGroup.append("g").classed("descriptionHost", true);

    this.descriptions = descriptionHost.selectAll<SVGTextElement, IQuteGraphLayoutNode>("description")
      .data(this.currentNodes)
      .enter().append("text")
      .attr("x", 0)
      .attr("y", 13)
      .attr("class", "stateTypeLabel")
      .text((node) => {
        return node.name; //stateType[node.type].short;
      });

    const labelsHost = this.topGroup.append("g").classed("labelsHost", true);

    /*this.linkLabels = labelsHost.selectAll("labels")
      .data(links)
      .enter().append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("class", "linkLabel")
      .call(this.appendLinkText);*/

    this.simulation = d3.forceSimulation(this.currentNodes)
      .force("charge", d3.forceManyBody().strength(-400))
      .force("collide", d3.forceCollide(100).strength(0.5).iterations(3))
      .force("link", d3.forceLink(links)
        .distance(200)
        .strength(2))
      .on("tick", this.animationTick)
      .on("end", this.animationEnd);

    // The simulation automatically starts, but we want to have it first do some iterations before
    // showing the initial layout. Makes for a much better initial display.
    this.simulation.stop();

    // Do a number of iterations without visual update, which is usually very fast (much faster than animating
    // each step).
    this.simulation.tick(100);

    // Now do the initial visual update.
    this.animationTick();
  }

  private animationTick = (): void => {
    this.figures.attr("transform", this.transform);
    this.textSelection.attr("transform", this.transform);
    this.descriptions.attr("transform", this.transform);

    //  this.transformLines();
    //  this.transformLinkLabels();
  };

  private animationEnd = (): void => {
    this.figures.attr("transform", this.snapTransform);
    this.textSelection.attr("transform", this.snapTransform);
    this.descriptions.attr("transform", this.snapTransform);

    //  this.transformLines();
    //  this.transformLinkLabels();
  };
  private transform = (node: IQuteGraphLayoutNode) => {
    return `translate(${node.x ?? 0},${node.y ?? 0})`;
  };

  private snapTransform = (node: IQuteGraphLayoutNode) => {
    return `translate(${this.snapToGrid(node.x ?? 0)},${this.snapToGrid(node.y ?? 0)})`;
  };

  private snapToGrid(value: number): number {
    return Math.round(value / QuteProjectGraphRenderer.gridSize) * QuteProjectGraphRenderer.gridSize;
  }

}
