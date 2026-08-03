import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/testUtils";
import ConfirmModal from "./ConfirmModal";

describe("ConfirmModal", () => {
    it("renders only when open", () => {
        const { rerender } = renderWithRouter(
            <ConfirmModal open={false} title="Sil" message="Emin misiniz?" onConfirm={vi.fn()} onCancel={vi.fn()} />
        );

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        rerender(
            <ConfirmModal open title="Sil" message="Emin misiniz?" onConfirm={vi.fn()} onCancel={vi.fn()} />
        );

        expect(screen.getByRole("dialog", { name: "Sil" })).toBeInTheDocument();
    });

    it("cancel closes without calling onConfirm", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        const onCancel = vi.fn();

        renderWithRouter(
            <ConfirmModal open title="Sil" message="Emin misiniz?" onConfirm={onConfirm} onCancel={onCancel} />
        );

        await user.click(screen.getByRole("button", { name: "İptal" }));

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("confirm calls onConfirm exactly once", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();

        renderWithRouter(
            <ConfirmModal open title="Sil" message="Emin misiniz?" onConfirm={onConfirm} onCancel={vi.fn()} />
        );

        await user.click(screen.getByRole("button", { name: "Onayla" }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("blocks duplicate confirm clicks while loading", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();

        renderWithRouter(
            <ConfirmModal open title="Sil" message="Emin misiniz?" loading onConfirm={onConfirm} onCancel={vi.fn()} />
        );

        await user.click(screen.getByRole("button", { name: "Onayla..." }));

        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("Escape closes when not loading", () => {
        const onCancel = vi.fn();

        renderWithRouter(
            <ConfirmModal open title="Sil" message="Emin misiniz?" onConfirm={vi.fn()} onCancel={onCancel} />
        );

        fireEvent.keyDown(document, { key: "Escape" });

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("Escape does not close while loading", () => {
        const onCancel = vi.fn();

        renderWithRouter(
            <ConfirmModal open title="Sil" message="Emin misiniz?" loading onConfirm={vi.fn()} onCancel={onCancel} />
        );

        fireEvent.keyDown(document, { key: "Escape" });

        expect(onCancel).not.toHaveBeenCalled();
    });

    it("moves focus into the modal and restores focus after close", async () => {
        function ModalHarness() {
            const [open, setOpen] = useState(false);

            return (
                <>
                    <button type="button" onClick={() => setOpen(true)}>Sil</button>
                    <ConfirmModal
                        open={open}
                        title="Sil"
                        message="Emin misiniz?"
                        onConfirm={vi.fn()}
                        onCancel={() => setOpen(false)}
                    />
                </>
            );
        }

        const user = userEvent.setup();
        renderWithRouter(<ModalHarness />);

        const trigger = screen.getByRole("button", { name: "Sil" });
        trigger.focus();
        await user.click(trigger);

        await waitFor(() => expect(screen.getByRole("button", { name: "İptal" })).toHaveFocus());
        await user.click(screen.getByRole("button", { name: "İptal" }));

        expect(trigger).toHaveFocus();
    });
});
