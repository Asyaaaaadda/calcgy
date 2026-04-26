function setupGuideAccordion() {
    const media = window.matchMedia("(max-width: 760px)");
    const items = Array.from(document.querySelectorAll(".guide-item"));
    const titleButtons = Array.from(document.querySelectorAll(".guide-title"));

    if (items.length === 0 || titleButtons.length === 0) return;

    const closeAll = () => {
        items.forEach((item) => item.classList.remove("is-open"));
        titleButtons.forEach((button) => button.setAttribute("aria-expanded", "false"));
    };

    const openItem = (targetItem) => {
        items.forEach((item) => {
            const isTarget = item === targetItem;
            item.classList.toggle("is-open", isTarget);

            const button = item.querySelector(".guide-title");
            if (button) button.setAttribute("aria-expanded", String(isTarget));
        });
    };

    titleButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (!media.matches) return;

            const item = button.closest(".guide-item");
            if (!item) return;

            const shouldOpen = !item.classList.contains("is-open");
            if (!shouldOpen) {
                closeAll();
                return;
            }

            openItem(item);
        });
    });

    media.addEventListener("change", (event) => {
        if (!event.matches) {
            closeAll();
        }
    });

    closeAll();
}

window.addEventListener("load", setupGuideAccordion);
