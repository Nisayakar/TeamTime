import type { NavigateFunction } from "react-router-dom";

export function navigateForInitialLoadError(status: number, navigate: NavigateFunction) {
    if (status === 403) {
        navigate("/forbidden", { replace: true });
        return true;
    }

    if (status === 404) {
        navigate("/not-found", { replace: true });
        return true;
    }

    return false;
}
