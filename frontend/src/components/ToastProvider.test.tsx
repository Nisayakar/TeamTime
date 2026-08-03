import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useToast } from "../context/toast";
import { renderWithProviders } from "../test/testUtils";

function ToastHarness() {
    const { showToast } = useToast();

    return (
        <div>
            <button type="button" onClick={() => showToast({ type: "success", message: "İşlem başarılı." })}>
                Success
            </button>
            <button type="button" onClick={() => showToast({ type: "error", message: "İşlem başarısız." })}>
                Error
            </button>
            <button type="button" onClick={() => {
                for (let index = 1; index <= 5; index++) {
                    showToast({ type: "info", message: `Toast ${index}`, duration: 0 });
                }
            }}>
                Many
            </button>
        </div>
    );
}

describe("ToastProvider", () => {
    it("shows success and error toasts with accessible roles", () => {
        renderWithProviders(<ToastHarness />);

        fireEvent.click(screen.getByRole("button", { name: "Success" }));
        fireEvent.click(screen.getByRole("button", { name: "Error" }));

        expect(screen.getByRole("status")).toHaveTextContent("İşlem başarılı.");
        expect(screen.getByRole("alert")).toHaveTextContent("İşlem başarısız.");
    });

    it("dismisses a toast from the close button", () => {
        renderWithProviders(<ToastHarness />);

        fireEvent.click(screen.getByRole("button", { name: "Success" }));
        fireEvent.click(screen.getByRole("button", { name: "Bildirimi kapat" }));

        expect(screen.queryByText("İşlem başarılı.")).not.toBeInTheDocument();
    });

    it("auto-dismisses a toast after its duration", () => {
        vi.useFakeTimers();
        renderWithProviders(<ToastHarness />);

        fireEvent.click(screen.getByRole("button", { name: "Success" }));
        expect(screen.getByText("İşlem başarılı.")).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(screen.queryByText("İşlem başarılı.")).not.toBeInTheDocument();
    });

    it("keeps only the newest four toasts", () => {
        renderWithProviders(<ToastHarness />);

        fireEvent.click(screen.getByRole("button", { name: "Many" }));

        expect(screen.queryByText("Toast 1")).not.toBeInTheDocument();
        expect(screen.getByText("Toast 2")).toBeInTheDocument();
        expect(screen.getByText("Toast 5")).toBeInTheDocument();
    });
});
