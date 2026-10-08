<script setup lang="ts">
import { MessageCircle, Compass, Bookmark, ArrowUpRight, Plus, Search, ShieldCheck, Sparkles, ArrowRight, X, ChevronDown, ArrowLeft, Send, Heart, BriefcaseBusiness, GraduationCap, Monitor, Shuffle, Leaf, Check, Link, Menu, RefreshCw, QrCode, Download, SmilePlus } from '@lucide/vue'
const props = defineProps<{ name: string; size?: number }>()
const icons: Record<string, typeof MessageCircle> = { message: MessageCircle, compass: Compass, bookmark: Bookmark, arrow: ArrowUpRight, plus: Plus, search: Search, shield: ShieldCheck, sparkles: Sparkles, right: ArrowRight, close: X, down: ChevronDown, back: ArrowLeft, send: Send, heart: Heart, career: BriefcaseBusiness, education: GraduationCap, tech: Monitor, random: Shuffle, life: Leaf, check: Check, link: Link, menu: Menu, refresh: RefreshCw, qr: QrCode, download: Download, reaction: SmilePlus }
</script>
<template><component :is="icons[props.name] || MessageCircle" :size="size || 20" :stroke-width="1.7" aria-hidden="true" /></template>
