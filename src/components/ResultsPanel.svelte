<script lang="ts">
  /**
   * @component
   * ResultsPanel.svelte
   *
   * Renders a tabular display of thermal comfort model results for all visible inputs.
   * It dynamically groups results by category (e.g., "Heat Index", "UTCI") and applies
   * color-coded tones based on the comfort risk levels calculated by the models.
   */
  import {
    Card,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
  } from "flowbite-svelte";
  import { inputDisplayMetaById } from "../models/inputSlotPresentation";
  import type { InputId as InputIdType } from "../models/inputSlots";
  import type { ResultSectionViewModel } from "../state/comfortTool/types";

  let {
    activeInputId,
    visibleInputIds,
    resultSections,
    errorMessage,
    isLoading,
    toneToClass = {},
    embedded = false,
  }: {
    activeInputId: InputIdType;
    visibleInputIds: InputIdType[];
    resultSections: ResultSectionViewModel[];
    errorMessage: string;
    isLoading: boolean;
    toneToClass?: Record<string, string>;
    embedded?: boolean;
  } = $props();
</script>

{#snippet table(sections: ResultSectionViewModel[])}
  <Table>
    <TableHead>
      <TableHeadCell>Input</TableHeadCell>
      {#each sections as section}
        <TableHeadCell>{section.title}</TableHeadCell>
      {/each}
    </TableHead>
    <TableBody>
      {#each visibleInputIds as inputId}
        <TableBodyRow>
          <TableBodyCell
            class={`font-medium ${inputDisplayMetaById[inputId].accentClass}`}
          >
            {inputDisplayMetaById[inputId].label}
          </TableBodyCell>
          {#each sections as section}
            {@const cell = section.valuesByInput[inputId]}
            <!-- Determine the appropriate CSS class based on the cell's tone, and provide fallback defaults -->
            {@const toneClass = cell?.tone
              ? toneToClass[cell.tone] ||
                {
                  success: "text-emerald-700",
                  danger: "text-red-600",
                  warning: "text-orange-500",
                }[cell.tone] ||
                ""
              : ""}
            <!-- Render the cell, applying the appropriate tone class if a cell is found -->
            <TableBodyCell class={!cell ? "text-stone-400" : toneClass}>
              {#if cell}
                <div class="font-medium">{cell.text}</div>
                {#if cell.subtext}
                  <div class="text-[10px] opacity-70 mt-0.5">
                    {cell.subtext}
                  </div>
                {/if}
              {:else}
                <!-- Display loading state when results are being fetched -->
                {isLoading ? "Loading..." : "No result"}
              {/if}
            </TableBodyCell>
          {/each}
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>
{/snippet}

{#snippet content()}
  {@const groups = Array.from(
    new Set(resultSections.map((s) => s.group ?? "default")),
  )}

  <div class="flex flex-col gap-6">
    {#each groups as group}
      {@const sectionsInGroup = resultSections.filter(
        (s) => (s.group ?? "default") === group,
      )}
      <div class="flex flex-col gap-2">
        {#if group !== "default"}
          <h3
            class="text-[11px] font-bold uppercase tracking-widest text-stone-400 px-1"
          >
            {group}
          </h3>
        {/if}
        {@render table(sectionsInGroup)}
      </div>
    {/each}
  </div>
{/snippet}

{#if embedded}
  {@render content()}
{:else}
  <Card size="none" class="p-3">
    {@render content()}
  </Card>
{/if}
