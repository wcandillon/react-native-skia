// React Native Screens has no macOS native stack, so use the JavaScript stack.
// Stack 7.10.10+ tolerates InteractionManager being absent on newer React Native.
export { createStackNavigator } from "@react-navigation/stack";
