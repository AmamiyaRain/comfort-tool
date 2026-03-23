<script lang="ts">
  import {
    chromeBrand,
    footerCitation,
    footerContactLinks,
    footerDocumentationLink,
    footerGithubLink,
    footerSummary,
  } from "../models/siteChrome";

  function getLinkTarget(external?: boolean) {
    return external ? "_blank" : undefined;
  }

  function getLinkRel(external?: boolean) {
    return external ? "noreferrer" : undefined;
  }
</script>

<footer class="border-t border-stone-800 bg-stone-950 text-white">
  <div class="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-4">
          <img src={chromeBrand.footerLogoSrc} alt="CBE logo" class="h-9 w-auto object-contain" />
          <img src={chromeBrand.berkeleyLogoSrc} alt="UC Berkeley logo" class="h-7 w-auto object-contain opacity-85" />
        </div>

        <div class="mt-3">
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{chromeBrand.eyebrow}</div>
          <div class="mt-1 text-base font-semibold tracking-tight text-white">{chromeBrand.title}</div>
          <p class="mt-1 text-sm text-white/58">
            {footerSummary}
          </p>
        </div>
      </div>

      <nav class="flex flex-wrap items-center gap-3" aria-label="Footer links">
        <a
          href={footerDocumentationLink.href}
          target={getLinkTarget(footerDocumentationLink.external)}
          rel={getLinkRel(footerDocumentationLink.external)}
          class="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/82 transition hover:border-white/22 hover:bg-white/[0.1] hover:text-white"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4.75 2.5A2.25 2.25 0 0 0 2.5 4.75v8.5a2.25 2.25 0 0 0 2.25 2.25h8.19a2.25 2.25 0 0 0 1.6-.66l.3-.3a2.25 2.25 0 0 0 .66-1.59V4.75A2.25 2.25 0 0 0 13.25 2.5h-8.5Zm1.5 3a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H7a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5H7a.75.75 0 0 1-.75-.75Zm0 3A.75.75 0 0 1 7 10.75h6a.75.75 0 0 1 0 1.5H7a.75.75 0 0 1-.75-.75Z"></path>
          </svg>
          <span>{footerDocumentationLink.label}</span>
        </a>

        <a
          href={footerGithubLink.href}
          target={getLinkTarget(footerGithubLink.external)}
          rel={getLinkRel(footerGithubLink.external)}
          class="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/82 transition hover:border-white/22 hover:bg-white/[0.1] hover:text-white"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12A11.5 11.5 0 0 0 8.36 22.93c.58.1.79-.25.79-.56v-1.96c-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.04 1.76 2.72 1.25 3.38.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.27-5.23-5.67 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.14 1.18A10.91 10.91 0 0 1 12 6.02c.98 0 1.97.13 2.89.39 2.18-1.49 3.14-1.18 3.14-1.18.62 1.59.23 2.76.11 3.05.73.8 1.18 1.82 1.18 3.07 0 4.41-2.68 5.37-5.24 5.66.41.35.78 1.03.78 2.08v3.09c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"></path>
          </svg>
          <span>{footerGithubLink.label}</span>
        </a>

        {#each footerContactLinks as link}
          <a
            href={link.href}
            target={getLinkTarget(link.external)}
            rel={getLinkRel(link.external)}
            class="inline-flex items-center gap-2 rounded-full border border-sky-400/22 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300/35 hover:bg-sky-400/16 hover:text-white"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 2.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Zm-6 13A4.5 4.5 0 0 1 8.5 11h3A4.5 4.5 0 0 1 16 15.5v.25a.75.75 0 0 1-.75.75h-10a.75.75 0 0 1-.75-.75v-.25Z"></path>
            </svg>
            <span>{link.label}</span>
          </a>
        {/each}
      </nav>
    </div>

    <div class="mt-5 border-t border-white/10 pt-4 text-xs leading-6 text-white/38">
      {footerCitation}
    </div>
  </div>
</footer>
