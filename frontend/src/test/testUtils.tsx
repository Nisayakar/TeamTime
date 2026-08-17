import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { ToastProvider } from "../components/ToastProvider";
import { ThemeProvider } from "../context/ThemeContext";

type RenderWithRouterOptions = RenderOptions & {
    routerProps?: MemoryRouterProps;
};

export function profile(
    name = "Ayşe",
    surname = "Demir",
    email = "ayse@example.com",
    username = "aysedemir"
) {
    return {
        id: 1,
        name,
        surname,
        email,
        username,
        role: "USER"
    };
}

export function renderWithRouter(ui: ReactElement, options: RenderWithRouterOptions = {}) {
    const { routerProps, ...renderOptions } = options;

    return render(
        <MemoryRouter {...routerProps}>
            <ThemeProvider>
                {ui}
            </ThemeProvider>
        </MemoryRouter>,
        renderOptions
    );
}

export function renderWithProviders(ui: ReactElement, options: RenderWithRouterOptions = {}) {
    const { routerProps, ...renderOptions } = options;

    return render(
        <MemoryRouter {...routerProps}>
            <ThemeProvider>
                <ToastProvider>
                    {ui}
                </ToastProvider>
            </ThemeProvider>
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
