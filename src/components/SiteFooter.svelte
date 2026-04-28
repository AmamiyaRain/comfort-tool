<script lang="ts">
  import {
    Footer,
    FooterBrand,
    FooterLink,
    FooterLinkGroup,
    Heading,
    Img,
  } from "flowbite-svelte";
  import {
    siteBrand,
    siteFooterCitation,
    siteFooterContactLinks,
    siteFooterDocumentationLink,
    siteFooterGithubLink,
    siteFooterSummary,
  } from "../models/siteShellConfig";

  function getLinkTarget(external?: boolean) {
    return external ? "_blank" : undefined;
  }

  function getLinkRel(external?: boolean) {
    return external ? "noreferrer" : undefined;
  }
</script>

<Footer footerType="custom" class="border-t border-stone-800 bg-stone-950 text-white rounded-none">
  <div class="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <header class="flex flex-wrap items-center gap-4">
          <FooterBrand
            href="#overview"
            src={siteBrand.footerLogoSrc}
            alt="CBE logo"
            class="h-9 w-auto object-contain"
          />
          <Img src={siteBrand.berkeleyLogoSrc} alt="UC Berkeley logo" class="h-7 w-auto object-contain opacity-85" />
        </header>

        <div class="mt-3">
          <Heading tag="h6" class="text-eyebrow tracking-[0.18em] text-white/40">{siteBrand.eyebrow}</Heading>
          <Heading tag="h2" class="mt-1 text-base font-semibold tracking-tight text-white">{siteBrand.title}</Heading>
          <p class="mt-1 text-sm text-white/58 max-w-2xl">
            {siteFooterSummary}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-x-8 gap-y-4">
        <div>
          <Heading tag="h2" class="text-footer-label">Resources</Heading>
          <FooterLinkGroup class="flex-col space-y-2">
            <FooterLink
              href={siteFooterDocumentationLink.href}
              target={getLinkTarget(siteFooterDocumentationLink.external)}
              rel={getLinkRel(siteFooterDocumentationLink.external)}
              class="text-sm text-white/80 hover:text-white"
            >
              {siteFooterDocumentationLink.label}
            </FooterLink>
            <FooterLink
              href={siteFooterGithubLink.href}
              target={getLinkTarget(siteFooterGithubLink.external)}
              rel={getLinkRel(siteFooterGithubLink.external)}
              class="text-sm text-white/80 hover:text-white"
            >
              {siteFooterGithubLink.label}
            </FooterLink>
          </FooterLinkGroup>
        </div>

        <div>
          <Heading tag="h2" class="text-footer-label">Contact</Heading>
          <FooterLinkGroup class="flex-col space-y-2">
            {#each siteFooterContactLinks as link}
              <FooterLink
                href={link.href}
                target={getLinkTarget(link.external)}
                rel={getLinkRel(link.external)}
                class="text-sm text-sky-300 hover:text-sky-200"
              >
                {link.label}
              </FooterLink>
            {/each}
          </FooterLinkGroup>
        </div>
      </div>
    </div>

    <p class="mt-5 border-t border-white/10 pt-4 text-xs leading-6 text-white/38">
      {siteFooterCitation}
    </p>
  </div>
</Footer>
