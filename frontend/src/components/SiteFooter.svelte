<script lang="ts">
  import { chromeBrand, footerCitation } from "../models/siteChrome";
</script>

<footer class="border-t border-stone-200 bg-stone-950 text-white">
  <div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
    <div class="flex flex-wrap items-center gap-6">
      <img src={chromeBrand.footerLogoSrc} alt="CBE logo" class="h-10 w-auto object-contain" />
      <img src={chromeBrand.berkeleyLogoSrc} alt="UC Berkeley logo" class="h-8 w-auto object-contain opacity-90" />
    </div>

    <p class="max-w-3xl text-sm leading-6 text-white/70">
      {footerCitation}
    </p>
  </div>
</footer>
