<script lang="ts">
  import SiteFooter from "./SiteFooter.svelte";
  import SiteHeader from "./SiteHeader.svelte";
</script>

<div class="min-h-screen bg-white text-stone-950">
  <div class="flex min-h-screen flex-col">
    <SiteHeader />

    <main class="flex-1">
      <slot />
    </main>

    <SiteFooter />
  </div>
</div>
