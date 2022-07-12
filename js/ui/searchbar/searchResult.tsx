import {
  For,
  Show,
  onMount,
  onCleanup,
  ComponentProps,
  mergeProps,
} from "solid-js";

export interface Result {
  title: string;
  header?: boolean;
  metadata?: string[];
  secondaryText?: string;
  className?: string;
  icon?: string;
  image?: string;
  opacity?: number;
  iconImage?: string;
  colorCircle?: number | string;
  attribution?: string;
  descriptionBlock?: string;
  delete?: () => void;
  showDeleteButton?: boolean;
  fakeFocus?: boolean;
  url?: string;
  click?: (...args: any) => void;
  button?: {
    icon: string;
    fn: (self: HTMLButtonElement) => void;
  };
}

interface ResultItemProps extends ComponentProps<"div"> {
  data: Result;
  onSelectResult?: (url: string, event?: MouseEvent) => void;
  onDeleteResult?: (url: string, event?: MouseEvent) => void;
}

const SearchResult = (props: ResultItemProps) => {
  let item: HTMLDivElement;

  onMount(() => {
    if (props.data.header) return;

    if (props.data.click) {
      item.addEventListener("click", props.data.click);
    }
    
    if (props.data.url) {
      item.setAttribute("data-url", props.data.url);
      item.addEventListener("click", (e) => {
        props?.onSelectResult(props.data.url, e);
      });

      item.addEventListener("keyup", (e) => {
        if (e.keyCode === 39 || e.keyCode === 32) {
          const input = document.getElementById(
            "tab-editor-input"
          ) as HTMLInputElement;
          input.value = props.data.url;
          input.focus();
        }
      });
    }

    item.addEventListener("keydown", (e) => {
      if (e.keyCode === 13) {
        item.click();
      }
    });
  });

  const style = mergeProps({ opacity: props.data.opacity }, props.style);

  return (
    <div
      ref={item}
      style={style}
      tabindex="-1"
      class="searchbar-item"
      classList={{
        fakefocus: props.data.fakeFocus,
        "has-action-button": props.data.showDeleteButton,
        [props.data.className]: !!props.data.className,
      }}
    >
      <Show when={props.data.iconImage}>
        <img class="icon-image" src={props.data.iconImage} aria-hidden="true" />
      </Show>

      <Show when={props.data.image}>
        <img class="icon-image" src={props.data.image} aria-hidden="true" />
      </Show>

      <Show when={props.data.colorCircle}>
        <div
          class="image color-circle"
          style={{
            background: props.data.colorCircle,
          }}
        />
      </Show>

      <Show when={props.data.icon}>
        <i class={`i ${props.data.icon}`} />
      </Show>

      <Show when={props.data.title}>
        <span class={`title ${!props.data.secondaryText ? "wide" : ""}`}>
          {props.data.title.substring(0, 1000)}
        </span>
      </Show>

      <Show when={props.data.secondaryText}>
        <span class="secondary-text">
          {props.data.secondaryText.substring(0, 1000)}
          <Show when={Array.isArray(props.data.metadata)}>
            <For each={props.data.metadata}>
              {(metadata) => <span class="md-info">{metadata}</span>}
            </For>
          </Show>
        </span>
      </Show>

      <Show when={props.data.descriptionBlock}>
        <span class="description-block">{props.data.descriptionBlock}</span>
        <Show when={props.data.attribution}>
          <span class="attribution">{props.data.attribution}</span>
        </Show>
      </Show>

      <Show when={props.data.attribution && !props.data.descriptionBlock}>
        <span class="attribution">{props.data.attribution}</span>
      </Show>

      <Show when={props.data.showDeleteButton && props.onDeleteResult}>
        <button
          tabIndex="-1"
          class="action-button ignores-keyboard-focus i carbon:close"
          onClick={[props.onDeleteResult, props.data.url]}
        />
      </Show>
    </div>
  );
};

const ResultHeader = (props: ResultItemProps) => {
  return (
    <h4 class="searchbar-heading" style={props.style}>
      {props.data.title}
    </h4>
  );
};

export const ResultItem = (props: ResultItemProps) => {
  return (
    <Show
      when={props.data.header !== true}
      fallback={<ResultHeader data={props.data} style={props.style} />}
    >
      <SearchResult
        data={props.data}
        style={props.style}
        onSelectResult={props.onSelectResult}
        onDeleteResult={props.onDeleteResult}
      />
    </Show>
  );
};
