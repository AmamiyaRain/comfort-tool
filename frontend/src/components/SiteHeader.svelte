<script lang="ts">
  import { chromeBrand, headerActionLinks } from "../models/siteChrome";

  function getLinkTarget(external?: boolean) {
    return external ? "_blank" : undefined;
  }

  function getLinkRel(external?: boolean) {
    return external ? "noreferrer" : undefined;
  }
</script>

<header class="border-b border-stone-200 bg-white">
  <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
    <a href="#overview" class="flex min-w-0 items-center gap-4">
      <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#124f7f] p-2">
        <img src={chromeBrand.headerLogoSrc} alt={chromeBrand.eyebrow} class="h-full w-full object-contain" />
      </div>

      <div class="min-w-0">
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">{chromeBrand.eyebrow}</div>
        <h1 class="truncate text-lg font-semibold tracking-tight text-stone-950 sm:text-xl">{chromeBrand.title}</h1>
      </div>
    </a>

    <nav class="flex flex-wrap items-center gap-3" aria-label="Header links">
      {#each headerActionLinks as link, index}
        <a
          href={link.href}
          target={getLinkTarget(link.external)}
          rel={getLinkRel(link.external)}
          class={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
            index === 0
              ? "border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:text-stone-950"
              : "bg-stone-950 text-white hover:bg-stone-800"
          }`}
        >
          {link.label}
        </a>
      {/each}
    </nav>
  </div>
</header>
