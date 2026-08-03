import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { ToastProvider } from "../components/ToastProvider";

type RenderWithRouterOptions = RenderOptions & {
    routerProps?: MemoryRouterProps;
};

export function renderWithRouter(ui: ReactElement, options: RenderWithRouterOptions = {}) {
    const { routerProps, ...renderOptions } = options;

    return render(
        <MemoryRouter {...routerProps}>
            {ui}
        </MemoryRouter>,
        renderOptions
    );
}

export function renderWithProviders(ui: ReactElement, options: RenderWithRouterOptions = {}) {
    const { routerProps, ...renderOptions } = options;

    return render(
        <MemoryRouter {...routerProps}>
            <ToastProvider>
                {ui}
            </ToastProvider>
        </MemoryRouter>,
        renderOptions
    );
}

export function mockJsonResponse(data: unknown, init: ResponseInit = {}) {
    return new Response(JSON.stringify(data), {
        status: init.status ?? 200,
        headers: {
            "Content-Type": "application/json",
            ...init.headers
        }
    });
}

export function mockTextResponse(text: string, init: ResponseInit = {}) {
    return new Response(text, {
        status: init.status ?? 200,
        headers: {
            "Content-Type": "text/plain",
            ...init.headers
        }
    });
}
