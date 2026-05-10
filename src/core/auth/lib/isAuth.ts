import { useSessionStore } from "../store/useSessionStore";

export const isAuth = () => Boolean(useSessionStore.getState().accessToken);
