import { onMounted, onUnmounted, type Ref } from 'vue'

type ClickOutsideEvent = MouseEvent | TouchEvent

export function useClickOutside(
  targetRef: Ref<HTMLElement | null>,
  onClickOutside: (event: ClickOutsideEvent) => void,
  isEnabled: Ref<boolean>,
): void {
  const listener = (event: ClickOutsideEvent): void => {
    if (!isEnabled.value) {
      return
    }

    const target = targetRef.value
    if (!target) {
      return
    }

    const path = event.composedPath()
    if (path.includes(target)) {
      return
    }

    onClickOutside(event)
  }

  onMounted(() => {
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
  })

  onUnmounted(() => {
    document.removeEventListener('mousedown', listener)
    document.removeEventListener('touchstart', listener)
  })
}
