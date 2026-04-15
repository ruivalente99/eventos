"use client";
import * as React from "react";

type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastState = { toasts: ToastProps[] };
type Action =
  | { type: "ADD"; toast: ToastProps }
  | { type: "REMOVE"; id: string };

const reducer = (state: ToastState, action: Action): ToastState => {
  switch (action.type) {
    case "ADD":
      return { toasts: [...state.toasts.slice(-2), action.toast] };
    case "REMOVE":
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
  }
};

let dispatch: React.Dispatch<Action> | null = null;
let state: ToastState = { toasts: [] };
const listeners: Array<(s: ToastState) => void> = [];

function emitChange(newState: ToastState) {
  state = newState;
  listeners.forEach((l) => l(state));
}

export function toast(props: Omit<ToastProps, "id">) {
  const id = Math.random().toString(36).slice(2);
  const newState = reducer(state, { type: "ADD", toast: { ...props, id } });
  emitChange(newState);
  setTimeout(() => emitChange(reducer(state, { type: "REMOVE", id })), 4000);
}

export function useToast() {
  const [toastState, setToastState] = React.useState<ToastState>(state);

  React.useEffect(() => {
    listeners.push(setToastState);
    return () => {
      const idx = listeners.indexOf(setToastState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    toasts: toastState.toasts,
    toast,
    dismiss: (id: string) => emitChange(reducer(state, { type: "REMOVE", id })),
  };
}
