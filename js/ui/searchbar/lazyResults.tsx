import { Show, For, onMount, createSignal, createMemo } from "solid-js";
import { Result, ResultItem } from "./searchResult";

const PlaceholderResult = () => <div class="searchbar-item placeholder" />;

interface LazyResultsProps {
  data: Result[];
}

const ITEM_HEIGHT = 36;
const ITEM_BUFFER = 2;

export const LazyResults = (props: LazyResultsProps) => {
  let container: HTMLDivElement;
  const [position, setPosition] = createSignal(0);

  const handleScroll = (event: UIEvent & { target: Element }) => {
    setPosition(event.target.scrollTop);
  };

  const visibleRange = createMemo(() => {
    const containerHeight = container?.scrollHeight;
    if (!containerHeight || containerHeight <= 0) {
      return { start: 0, end: 0 };
    }
    const start = Math.floor(position() / ITEM_HEIGHT);
    const end = start + Math.max(Math.ceil(containerHeight / ITEM_HEIGHT), 1);
    return {
      start: Math.max(start - ITEM_BUFFER, 0),
      end: Math.min(end + ITEM_BUFFER, props.data.length),
    };
  });

  const containerHeight =
    props.data.length * ITEM_HEIGHT + ITEM_BUFFER * ITEM_HEIGHT;

  return (
    <div
      ref={container}
      onScroll={handleScroll}
      class="searchbar-plugin-container"
      style={{ height: containerHeight }}
    >
      <For each={props.data}>
        {(item, index) => (
          <Show
            fallback={null}
            when={
              index() >= visibleRange().start && index() <= visibleRange().end
            }
          >
            <ResultItem
              data={item}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${index() * ITEM_HEIGHT}px)`,
              }}
            />
          </Show>
        )}
      </For>
    </div>
  );
};
