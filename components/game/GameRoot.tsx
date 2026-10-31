"use client";

import { useEffect, useMemo, useReducer, useState, useSyncExternalStore } from "react";
import { reducer } from "@/lib/game/reducer";
import { clearSave, parseSave, readSaveRaw, subscribeSave, writeSave } from "@/lib/game/save";
import { CharacterCreator } from "./CharacterCreator";
import { DeckGame } from "./deck/DeckGame";
import { MainGame } from "./MainGame";
import { PhoneGame } from "./phone/PhoneGame";
import type { GameProps, Skin } from "./shell";
import { RecapScreen } from "./RecapScreen";
import { TitleScreen } from "./TitleScreen";

type Screen = { name: "title" } | { name: "create"; seed: number };

const MAINS: Record<Skin, (p: GameProps) => React.ReactNode> = {
  terminal: MainGame,
  phone: PhoneGame,
  deck: DeckGame,
};

export function GameRoot({ skin = "terminal" }: { skin?: Skin }) {
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
    const Main = MAINS[skin];
    return (
      <Main
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
      skin={skin}
      saved={saved}
      onContinue={() => saved && dispatch({ type: "LOAD", state: saved })}
      onNewLife={(seed) => setScreen({ name: "create", seed })}
    />
  );
}
