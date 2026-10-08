<script setup lang="ts">
import type { Question } from '~/types'
const props = defineProps<{ question: Question }>()
const { questionReactions, reactToQuestion } = useAsk()
</script>
<template>
  <ReactionBar :stats="questionReactions[question.id]" label="Reaksi pertanyaan" :on-react="emoji => reactToQuestion(props.question, emoji)" />
</template>
