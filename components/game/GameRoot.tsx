"use client";

import { useEffect, useMemo, useReducer, useState, useSyncExternalStore } from "react";
import { reducer } from "@/lib/game/reducer";
import { clearSave, parseSave, readSaveRaw, subscribeSave, writeSave } from "@/lib/game/save";
import { CharacterCreator } from "./CharacterCreator";
import { MainGame } from "./MainGame";
import { RecapScreen } from "./RecapScreen";
import { TitleScreen } from "./TitleScreen";

type Screen = { name: "title" } | { name: "create"; seed: number };

export function GameRoot() {
  const [state, dispatch] = useReducer(reducer, null);
  const [screen, setScreen] = useState<Screen>({ name: "title" });
  const saveRaw = useSyncExternalStore(subscribeSave, readSaveRaw, () => null);
  const saved = useMemo(() => parseSave(saveRaw), [saveRaw]);

  // Autosave after every change.
  useEffect(() => {
    if (state) writeSave(state);
  }, [state]);

  if (state && state.ended) {
    return (
      <RecapScreen
        state={state}
        onNewLife={(seed) => {
          clearSave();
          dispatch({ type: "EXIT" });
          setScreen({ name: "create", seed });
        }}
      />
    );
  }

  if (state) {
    return (
      <MainGame
        state={state}
        dispatch={dispatch}
        onExit={() => {
          dispatch({ type: "EXIT" });
          setScreen({ name: "title" });
        }}
      />
    );
  }

  if (screen.name === "create") {
    return (
      <CharacterCreator
        initialSeed={screen.seed}
        onBack={() => setScreen({ name: "title" })}
        onStart={(draft, seed) => dispatch({ type: "NEW_GAME", draft, seed })}
      />
    );
  }

  return (
    <TitleScreen
      saved={saved}
      onContinue={() => saved && dispatch({ type: "LOAD", state: saved })}
      onNewLife={(seed) => setScreen({ name: "create", seed })}
    />
  );
}
