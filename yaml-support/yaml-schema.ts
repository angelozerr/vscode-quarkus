import * as _ from 'lodash';
import * as semver from 'semver';
import Uri from 'vscode-uri';
import * as vscode from 'vscode';
import { VSCODE_YAML_EXTENSION_ID, KUBERNETES_SCHEMA, KUBERNETES_SCHEMA_PREFIX } from "./yaml-constant";
import { commands } from 'vscode';
//import { BackgroundContextCache } from '../components/contextmanager/background-context-cache';
//import { KubernetesClusterSchemaHolder } from './schema-holder';

// The function signature exposed by vscode-yaml:
// 1. the requestSchema api will be called by vscode-yaml extension to decide whether the schema can be handled by this
// contributor, if it returns undefined, means it doesn't support this yaml file, vscode-yaml will ask other contributors
// 2. the requestSchemaContent api  will give the parameter uri returned by the first api, and ask for the json content(after stringify) of
// the schema
declare type YamlSchemaContributor = (schema: string,
  requestSchema: (resource: string) => string | undefined,
  requestSchemaContent: (uri: string) => string) => void;

interface ItemMetadata {
  name: string;
  description: string;
}
interface ConfigurationMetadata {
  properties: ItemMetadata[];
}
interface MicroProfileProjectInfo extends ConfigurationMetadata {

}

let schemas: /*BackgroundContextCache<KubernetesClusterSchemaHolder> | */ null = null;

let schema2 = null;

export async function registerYamlSchemaSupport(): Promise<void> {
  /*schemas = new BackgroundContextCache(
      activeContextTracker,
      () => KubernetesClusterSchemaHolder.fromActiveCluster(kubectl),
      KubernetesClusterSchemaHolder.fallback());
*/
  const yamlPlugin: any = await activateYamlExtension();
  if (!yamlPlugin || !yamlPlugin.registerContributor) {
      // activateYamlExtension has already alerted to users for errors.
      return;
  }
  // register for kubernetes schema provider
  yamlPlugin.registerContributor(KUBERNETES_SCHEMA, requestYamlSchemaUriCallback,  requestYamlSchemaContentCallback);
}

// see docs from YamlSchemaContributor
function requestYamlSchemaUriCallback(resource: string): string | undefined {
  const textEditor = vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === resource);
  if (textEditor) {
      //const yamlDocs = yamlLocator.getYamlDocuments(textEditor.document);
      //const choices: string[] = [];
      const activeSchema = schemas ;//&& schemas.active();
      if (!activeSchema) {
          //return undefined;
      }
      if (resource.endsWith('application.yaml')) {
        return KUBERNETES_SCHEMA_PREFIX + resource;
      }
      /*yamlDocs.forEach((doc) => {
          // if the yaml document contains apiVersion and kind node, it will report it is a kubernetes yaml
          // file
          const topLevelMapping = <YamlMap>doc.nodes.find((node) => node.kind === 'MAPPING');
          if (topLevelMapping) {
              // if the overall yaml is an map, find the apiVersion and kind properties in yaml
              const apiVersion = util.getYamlMappingValue(topLevelMapping, 'apiVersion');
              const kind = util.getYamlMappingValue(topLevelMapping, 'kind');
              if (apiVersion && kind) {
                  const qualifiedKind = apiVersion; // + GROUP_VERSION_KIND_SEPARATOR + kind;
                  // Check we have a schema here - returning undefined from the schema content callback reports an error
                  if (activeSchema.lookup(qualifiedKind)) {
                      choices.push(qualifiedKind);
                  }
              }
          }
      });
      return util.makeKubernetesUri(choices);
      */
  }
  return undefined;
}

// see docs from YamlSchemaContributor
function requestYamlSchemaContentCallback(uri: string): string | undefined {
  const parsedUri = Uri.parse(uri);
  if (parsedUri.scheme !== KUBERNETES_SCHEMA) {
      return undefined;
  }
  if (!parsedUri.path || !parsedUri.path.startsWith('/')) {
      return undefined;
  }
  if (!schemas) {
      //return undefined;
  }

  const params = {
    uri: uri.substring(KUBERNETES_SCHEMA_PREFIX.length),
    scopes: [1, 2]
  };
  const projectInfo: Thenable<MicroProfileProjectInfo> = commands.executeCommand("java.execute.workspaceCommand", "microprofile/projectInfo", params);
  projectInfo.then(info => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      additionalProperties : false,
      properties: {}
    };
    info.properties.forEach(item => {
      try {
      let parent = schema.properties;
      const paths: string[] = item.name.split('.');
      for (let i = 0; i < paths.length - 1; i++) {
        const path = paths[i];
        if (!parent[path]) {
          parent[path] = {type : 'object', properties: {}};
        }
        if (!parent[path].properties) {
          parent[path].properties = {};
        }
        parent = parent[path].properties;
      }
      const property = {};
      parent[paths[paths.length -1]] = property;
      if (item.description) {
        property['description'] = item.description;
      }
    }
    catch (e) {
      console.error(e);
    }
    });

    schema2 = schema;

  return null;
  });
  // slice(1) to remove the first '/' in schema
  // eg: kubernetes://schema/io.k8s.kubernetes.pkg.apis.extensions.v1beta1.httpingresspath will have
  // path '/io.k8s.kubernetes.pkg.apis.extensions.v1beta1.httpingresspath'
 /* const manifestType = parsedUri.path.slice(1);
  // if it is a multiple choice, make an 'oneof' schema.
  if (manifestType.includes('+')) {
      const manifestRefList = ""; //manifestType.split('+').choose(util.makeRefOnKubernetes);
      // yaml language server supports schemaSequence at
      // https://github.com/redhat-developer/yaml-language-server/pull/81
      return JSON.stringify({ schemaSequence: manifestRefList });
  }*/
  const schema = null;//schemas.active().lookup(manifestType);

  // convert it to string since vscode-yaml need the string format
  if (schema2) {
      return JSON.stringify(schema2);
  }
  return undefined;

}

// find redhat.vscode-yaml extension and try to activate it to get the yaml contributor
async function activateYamlExtension(): Promise<{registerContributor: YamlSchemaContributor} | undefined> {
  const ext = vscode.extensions.getExtension(VSCODE_YAML_EXTENSION_ID);
  if (!ext) {
      vscode.window.showWarningMessage('Please install \'YAML Support by Red Hat\' via the Extensions pane.');
      return undefined;
  }
  const yamlPlugin = await ext.activate();

  if (!yamlPlugin || !yamlPlugin.registerContributor) {
      vscode.window.showWarningMessage('The installed Red Hat YAML extension doesn\'t support Kubernetes Intellisense. Please upgrade \'YAML Support by Red Hat\' via the Extensions pane.');
      return undefined;
  }

  if (ext.packageJSON.version && !semver.gte(ext.packageJSON.version, '0.0.15')) {
      vscode.window.showWarningMessage('The installed Red Hat YAML extension doesn\'t support multiple schemas. Please upgrade \'YAML Support by Red Hat\' via the Extensions pane.');
  }
  return yamlPlugin;
}

export function updateYAMLSchema() {
  if (schemas) {
      //schemas.invalidateActive();
      // There doesn't seem to be a way to get the YAML extension to pick up the update so
      // for now users would need to close and reopen any affected open documents.  Raised
      // issue with RedHat: https://github.com/redhat-developer/vscode-yaml/issues/202
  }
}
