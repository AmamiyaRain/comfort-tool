<script lang="ts">
  import { onDestroy } from "svelte";

  import { siteBrand, siteHeaderLinks } from "../models/siteShellConfig";
  import { buildShareUrl } from "../state/comfortTool/shareState";
  import type { ComfortToolController } from "../state/comfortTool/types";

  let {
    toolState,
  }: {
    toolState: ComfortToolController;
  } = $props();

  let exportStatus = $state<"idle" | "copied" | "error">("idle");
  let exportStatusTimer: number | null = null;

  function getLinkTarget(external?: boolean) {
    return external ? "_blank" : undefined;
  }

  function getLinkRel(external?: boolean) {
    return external ? "noreferrer" : undefined;
  }

  function getExportLabel() {
    if (exportStatus === "copied") {
      return "Link Copied";
    }

    if (exportStatus === "error") {
      return "Copy Failed";
    }

    return "Export Link";
  }

  function resetExportStatusLater() {
    if (exportStatusTimer !== null) {
      window.clearTimeout(exportStatusTimer);
    }

    exportStatusTimer = window.setTimeout(() => {
      exportStatus = "idle";
      exportStatusTimer = null;
    }, 2200);
  }

  async function copyTextToClipboard(value: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  async function handleExportLink() {
    try {
      const shareUrl = buildShareUrl(toolState.actions.exportShareSnapshot(), window.location.href);
      await copyTextToClipboard(shareUrl);
      exportStatus = "copied";
    } catch {
      exportStatus = "error";
    }

    resetExportStatusLater();
  }

  onDestroy(() => {
    if (exportStatusTimer !== null) {
      window.clearTimeout(exportStatusTimer);
    }
  });
</script>

<header class="border-b border-stone-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
  <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <a href="#overview" class="flex min-w-0 items-center gap-4 hover:opacity-90">
      <figure class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#124f7f] p-2">
        <img src={siteBrand.headerLogoSrc} alt={siteBrand.eyebrow} class="h-full w-full object-contain" />
      </figure>

      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">{siteBrand.eyebrow}</p>
        <h1 class="truncate text-lg font-semibold tracking-tight text-stone-950 sm:text-xl">{siteBrand.title}</h1>
      </div>
    </a>

    <nav class="flex flex-wrap items-center gap-2" aria-label="Site actions">
      <button
        type="button"
        class={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold border transition-colors shadow-sm ${
          exportStatus === "copied" 
            ? "bg-green-50 border-green-200 text-green-700" 
            : exportStatus === "error" 
            ? "bg-red-50 border-red-200 text-red-700" 
            : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300"
        }`}
        onclick={() => void handleExportLink()}
      >
        <svg class="mr-2 h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
          <path d="M7.5 10.5 12.5 5.5a2.5 2.5 0 1 1 3.5 3.5l-5 5a2.5 2.5 0 0 1-3.5 0 2.5 2.5 0 0 1 0-3.5l4-4"></path>
          <path d="m12.5 9.5-5 5A2.5 2.5 0 1 1 4 11l5-5"></path>
        </svg>
        {getExportLabel()}
      </button>

      {#if siteHeaderLinks.length > 0}
        <ul class="flex flex-wrap items-center gap-2">
          {#each siteHeaderLinks as link}
            <li>
              <a
                href={link.href}
                target={getLinkTarget(link.external)}
                rel={getLinkRel(link.external)}
                class="inline-block rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-stone-300 hover:text-stone-950 transition-colors shadow-sm"
              >
                {link.label}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </nav>
  </div>
</header>

