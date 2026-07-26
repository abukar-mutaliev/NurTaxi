// Metro в монорепозитории: смотрим за общими пакетами и общим node_modules (M0.1).
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Пересборка при правках в packages/shared-core.
config.watchFolders = [workspaceRoot];

// Сначала локальные зависимости приложения, затем поднятые в корень workspace.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Без этого Metro может подтянуть чужую копию react/react-native из вложенного node_modules.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
