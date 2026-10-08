<script setup lang="ts">
import type { Answer } from '~/types'
const props = defineProps<{ answer: Answer }>()
const { answerReactions, reactToAnswer } = useAsk()
</script>
<template>
  <ReactionBar :stats="answerReactions[answer.id]" label="Reaksi jawaban" :on-react="emoji => reactToAnswer(props.answer, emoji)" />
</template>
