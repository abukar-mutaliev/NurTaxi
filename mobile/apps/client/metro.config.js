// Expo SDK 52+ автоматически настраивает Metro для npm workspaces.
// Ручные watchFolders/nodeModulesPaths/disableHierarchicalLookup ломали
// внутренние require() react-native (setUpDOM → runtime crash на старте).
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
