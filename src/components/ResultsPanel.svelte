<script lang="ts">
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
    embedded = false,
  }: {
    activeInputId: InputIdType;
    visibleInputIds: InputIdType[];
    resultSections: ResultSectionViewModel[];
    errorMessage: string;
    isLoading: boolean;
    embedded?: boolean;
  } = $props();
</script>

{#snippet content()}
  <Table>
    <TableHead>
      <TableHeadCell>Input</TableHeadCell>
      {#each resultSections as section}
        <TableHeadCell>{section.title}</TableHeadCell>
      {/each}
    </TableHead>
    <TableBody>
      {#each visibleInputIds as inputId}
        <TableBodyRow>
          <TableBodyCell class={`font-medium ${inputDisplayMetaById[inputId].accentClass}`}>
            {inputDisplayMetaById[inputId].label}
          </TableBodyCell>
          {#each resultSections as section}
            {@const cell = section.valuesByInput[inputId]}
            <TableBodyCell class={!cell ? "text-stone-400" : cell.tone === "success" ? "text-emerald-700" : cell.tone === "danger" ? "text-red-600" : ""}>
              {cell?.text ?? (isLoading ? "Loading..." : "No result")}
            </TableBodyCell>
          {/each}
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>
{/snippet}

{#if embedded}
  {@render content()}
{:else}
  <Card size="none" class="p-3">
    {@render content()}
  </Card>
{/if}
