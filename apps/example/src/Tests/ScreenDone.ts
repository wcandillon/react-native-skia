import { createContext, useContext } from "react";

// A screen whose content settles a chain of native events after it mounts,
// one the registry snapshots once done (see Screens), says when it has, and
// Tests takes its snapshot from then rather than from the mount.
export const ScreenDoneContext = createContext(() => {});

export const useScreenDone = () => useContext(ScreenDoneContext);
