import { useEffect, useRef, type RefObject } from 'react'

type UseInfiniteScrollOptions = {
  enabled: boolean
  onLoadMore: () => void
  rootMargin?: string
}

export function useInfiniteScroll<T extends HTMLElement>({
  enabled,
  onLoadMore,
  rootMargin = '240px',
}: UseInfiniteScrollOptions): RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return

    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        onLoadMore()
      }
    }, { rootMargin })

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, onLoadMore, rootMargin])

  return ref
}
