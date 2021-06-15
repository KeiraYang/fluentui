import {
  Accessibility,
  chatMessageBehavior,
  ChatMessageBehaviorProps,
  IS_FOCUSABLE_ATTRIBUTE,
  keyboardKey,
  menuAsToolbarBehavior,
} from '@fluentui/accessibility';
import {
  ComponentWithAs,
  getElementType,
  useAccessibility,
  useAutoControlled,
  useContextSelector,
  useFluentContext,
  useStyles,
  useTelemetry,
  useUnhandledProps,
} from '@fluentui/react-bindings';
import { Ref } from '@fluentui/react-component-ref';
import * as customPropTypes from '@fluentui/react-proptypes';
import cx from 'classnames';
import * as _ from 'lodash';
import * as PropTypes from 'prop-types';
import * as React from 'react';

import {
  ComponentEventHandler,
  ComponentKeyboardEventHandler,
  FluentComponentStaticProps,
  ObjectShorthandValue,
  ShorthandCollection,
  ShorthandValue,
} from '../../types';
import {
  ChildrenComponentProps,
  childrenExist,
  commonPropTypes,
  ContentComponentProps,
  createShorthand,
  createShorthandFactory,
  getOrGenerateIdFromShorthand,
  rtlTextContainer,
  UIComponentProps,
} from '../../utils';
import {
  getScrollParent,
  partitionPopperPropsFromShorthand,
  PopperModifiersFn,
  PopperRefHandle,
  PopperShorthandProps,
  usePopper,
} from '../../utils/positioner';
import { Box, BoxProps } from '../Box/Box';
import { Flex } from '../Flex/Flex';
import { Label, LabelProps } from '../Label/Label';
import { Menu, MenuProps } from '../Menu/Menu';
import { MenuItemProps } from '../Menu/MenuItem';
import { PortalInner } from '../Portal/PortalInner';
import { Reaction, ReactionProps } from '../Reaction/Reaction';
import { ReactionGroupProps } from '../Reaction/ReactionGroup';
import { Text, TextProps } from '../Text/Text';
import { ChatItemContext } from './chatItemContext';
import { ChatMessageDetails, ChatMessageDetailsProps } from './ChatMessageDetails';
import { ChatMessageHeader, ChatMessageHeaderProps } from './ChatMessageHeader';
import { ChatMessageReadStatus, ChatMessageReadStatusProps } from './ChatMessageReadStatus';

export interface ChatMessageSlotClassNames {
  actionMenu: string;
  author: string;
  badge: string;
  bar: string;
  compactBody: string;
  content: string;
  reactionGroup: string;
  timestamp: string;
}

export interface ChatMessageProps
  extends UIComponentProps,
    ChildrenComponentProps,
    ContentComponentProps<ShorthandValue<BoxProps>> {
  /** Accessibility behavior if overridden by the user. */
  accessibility?: Accessibility<ChatMessageBehaviorProps>;

  /** Menu with actions of the message. */
  actionMenu?: ShorthandValue<MenuProps & { popper?: PopperShorthandProps }> | ShorthandCollection<MenuItemProps>;

  /** Controls messages's relation to other chat messages. Is automatically set by the ChatItem. */
  attached?: boolean | 'top' | 'bottom';

  /** Author of the message. */
  author?: ShorthandValue<TextProps>;

  /** Controls the message density. Is automatically set by the ChatItem. */
  compact?: boolean;

  /** A message can have a custom body. Only rendered in compact density. */
  compactBody?: ShorthandValue<BoxProps>;

  /** Indicates whether message belongs to the current user. */
  mine?: boolean;

  /** A message can have a custom header. */
  header?: ShorthandValue<ChatMessageHeaderProps>;

  /** Timestamp of the message. */
  timestamp?: ShorthandValue<TextProps>;

  /** Message details info slot. Displayed in the header or body in comfy and compact density respectively. */
  details?: ShorthandValue<ChatMessageDetailsProps>;

  /** Message read status indicator. */
  readStatus?: ShorthandValue<ChatMessageReadStatusProps>;

  /** Badge attached to the message. */
  badge?: ShorthandValue<LabelProps>;

  /** A message can format the badge to appear at the start or the end of the message. */
  badgePosition?: 'start' | 'end';

  /**
   * Called after user's blur.
   * @param event - React's original SyntheticEvent.
   * @param data - All props.
   */
  onBlur?: ComponentEventHandler<ChatMessageProps>;

  /**
   * Called after user's focus.
   * @param event - React's original SyntheticEvent.
   * @param data - All props.
   */
  onFocus?: ComponentEventHandler<ChatMessageProps>;

  /**
   * Called after user enters by mouse.
   * @param event - React's original SyntheticEvent.
   * @param data - All props.
   */
  onMouseEnter?: ComponentEventHandler<ChatMessageProps>;

  /** Allows suppression of action menu positioning for performance reasons */
  positionActionMenu?: boolean;

  /** Reaction group applied to the message. */
  reactionGroup?: ShorthandValue<ReactionGroupProps> | ShorthandCollection<ReactionProps>;

  /** A message can format the reactions group to appear at the start or the end of the message. */
  reactionGroupPosition?: 'start' | 'end';

  /** Positions an actionMenu slot in "fixed" mode. */
  unstable_overflow?: boolean;
}

export type ChatMessageStylesProps = Pick<ChatMessageProps, 'attached' | 'badgePosition' | 'mine'> & {
  compact: boolean;
  hasBadge: boolean;
  hasReactionGroup: boolean;
};

export const chatMessageClassName = 'ui-chat__message';
export const chatMessageSlotClassNames: ChatMessageSlotClassNames = {
  actionMenu: `${chatMessageClassName}__actions`,
  author: `${chatMessageClassName}__author`,
  badge: `${chatMessageClassName}__badge`,
  bar: `${chatMessageClassName}__bar`,
  compactBody: `${chatMessageClassName}__compact-body`,
  content: `${chatMessageClassName}__content`,
  reactionGroup: `${chatMessageClassName}__reactions`,
  timestamp: `${chatMessageClassName}__timestamp`,
};

/**
 * A ChatMessage represents a single message in chat.
 */
export const ChatMessage: ComponentWithAs<'div', ChatMessageProps> &
  FluentComponentStaticProps<ChatMessageProps> = props => {
  const context = useFluentContext();
  const { setStart, setEnd } = useTelemetry(ChatMessage.displayName, context.telemetry);
  setStart();

  const parentAttached = useContextSelector(ChatItemContext, v => v.attached);
  const parentCompact = useContextSelector(ChatItemContext, v => v.compact);
  const {
    accessibility,
    attached = parentAttached,
    author,
    badge,
    badgePosition,
    children,
    className,
    compact = parentCompact,
    compactBody,
    content,
    design,
    details,
    header,
    mine,
    positionActionMenu,
    reactionGroup,
    reactionGroupPosition,
    readStatus,
    styles,
    timestamp,
    unstable_overflow: overflow,
    variables,
  } = props;

  const [actionMenu, positioningProps] = partitionPopperPropsFromShorthand(props.actionMenu);
  const hasActionMenu = !_.isNil(actionMenu);

  const modifiers = React.useCallback<PopperModifiersFn>(
    (target, container) => {
      return (
        positionActionMenu && [
          // https://popper.js.org/docs/v2/modifiers/flip/
          // Forces to flip only in "top-*" positions
          { name: 'flip', options: { fallbackPlacements: ['top'] } },
          overflow && {
            name: 'preventOverflow',
            options: { boundary: getScrollParent(container) },
          },
        ]
      );
    },
    [positionActionMenu, overflow],
  );

  const popperRef = React.useRef<PopperRefHandle>();
  const { targetRef: messageRef, containerRef: actionsMenuRef } = usePopper({
    align: 'end',
    position: 'above',
    positionFixed: overflow,

    enabled: hasActionMenu && positionActionMenu,
    modifiers,
    popperRef,

    ...positioningProps,
  });

  const [focused, setFocused] = React.useState<boolean>(false);

  const getA11Props = useAccessibility(accessibility, {
    actionHandlers: {
      // prevents default FocusZone behavior, e.g., in ChatMessageBehavior, it prevents FocusZone from using arrow keys
      // as navigation (only Tab key should work)
      preventDefault: event => {
        // preventDefault only if event coming from inside the message
        if (event.currentTarget !== event.target) {
          event.preventDefault();
        }
      },

      focus: event => {
        if (messageRef.current) {
          messageRef.current.focus();
          event.stopPropagation();
        }
      },
    },
  });

  const { classes, styles: resolvedStyles } = useStyles<ChatMessageStylesProps>(ChatMessage.displayName, {
    className: chatMessageClassName,
    mapPropsToStyles: () => ({
      attached,
      badgePosition,
      compact,
      focused,
      mine,
      hasBadge: !!badge,
      hasReactionGroup: !!reactionGroup,
    }),
    mapPropsToInlineStyles: () => ({
      className,
      design,
      styles,
      variables,
    }),
    rtl: context.rtl,
  });

  const handleFocus = (e: React.SyntheticEvent) => {
    popperRef.current?.updatePosition();

    setFocused(true);
    _.invoke(props, 'onFocus', e, props);
  };

  const handleBlur = (e: React.SyntheticEvent) => {
    // `focused` controls is focused the whole `ChatMessage` or any of its children. When we're navigating
    // with keyboard the focused element will be changed and there is no way to use `:focus` selector
    const shouldPreserveFocusState = _.invoke(e, 'currentTarget.contains', (e as any).relatedTarget);

    setFocused(shouldPreserveFocusState);
    _.invoke(props, 'onBlur', e, props);
  };

  const handleMouseEnter = (e: React.SyntheticEvent) => {
    popperRef.current?.updatePosition();
    _.invoke(props, 'onMouseEnter', e, props);
  };

  const renderActionMenu = () => {
    const actionMenuElement = Menu.create(actionMenu, {
      defaultProps: () => ({
        [IS_FOCUSABLE_ATTRIBUTE]: true,
        accessibility: menuAsToolbarBehavior,
        className: chatMessageSlotClassNames.actionMenu,
        styles: resolvedStyles.actionMenu,
      }),
    });

    if (!actionMenuElement) {
      return actionMenuElement;
    }

    return <Ref innerRef={actionsMenuRef}>{actionMenuElement}</Ref>;
  };

  const childrenPropExists = childrenExist(children);
  const rootClasses = childrenPropExists ? cx(classes.root, classes.content) : classes.root;

  const ElementType = getElementType(props);
  const unhandledProps = useUnhandledProps(ChatMessage.handledProps, props);

  const badgeElement = Label.create(badge, {
    defaultProps: () => ({
      className: chatMessageSlotClassNames.badge,
      styles: resolvedStyles.badge,
    }),
  });

  const reactionGroupElement = Reaction.Group.create(reactionGroup, {
    defaultProps: () => ({
      className: chatMessageSlotClassNames.reactionGroup,
      styles: resolvedStyles.reactionGroup,
    }),
  });

  const actionMenuElement = renderActionMenu();

  const authorElement = Text.create(author, {
    defaultProps: () => ({
      size: compact ? undefined : 'small',
      styles: resolvedStyles.author,
      className: chatMessageSlotClassNames.author,
    }),
  });

  const timestampElement = Text.create(timestamp, {
    defaultProps: () => ({
      size: 'small',
      styles: resolvedStyles.timestamp,
      timestamp: true,
      className: chatMessageSlotClassNames.timestamp,
    }),
  });

  const messageContent = Box.create(content, {
    defaultProps: () => ({
      className: chatMessageSlotClassNames.content,
      styles: resolvedStyles.content,
    }),
  });

  const detailsElement = createShorthand(ChatMessageDetails, details, {
    defaultProps: () => ({ compact, mine }),
  });

  const readStatusElement = createShorthand(ChatMessageReadStatus, readStatus, {
    defaultProps: () => ({ compact }),
  });

  let layout = <></>;
  if (compact) {
    const headerElement = createShorthand(ChatMessageHeader, header);

    const bodyElement = Box.create(compactBody, {
      defaultProps: () =>
        getA11Props('compactBody', {
          className: chatMessageSlotClassNames.compactBody,
          styles: resolvedStyles.compactBody,
        }),
      overrideProps: () => ({
        content: (
          <>
            <Flex.Item grow={1}>
              <div>
                {authorElement}
                {messageContent}
              </div>
            </Flex.Item>
            {timestampElement}
            {detailsElement}
            {badgeElement}
          </>
        ),
      }),
    });

    layout = (
      <>
        {actionMenuElement}
        <div className={chatMessageSlotClassNames.bar} />
        {headerElement}
        {bodyElement}
        {reactionGroupElement}
        {readStatusElement}
      </>
    );
  } else {
    const headerElement = createShorthand(ChatMessageHeader, header || {}, {
      overrideProps: () => ({
        content: (
          <>
            {authorElement}
            {timestampElement}
            {detailsElement}
            {reactionGroupPosition === 'start' && reactionGroupElement}
          </>
        ),
      }),
    });

    layout = (
      <>
        {actionMenuElement}
        <div className={chatMessageSlotClassNames.bar} />
        {badgePosition === 'start' && badgeElement}
        {headerElement}
        {messageContent}
        {reactionGroupPosition === 'end' && reactionGroupElement}
        {badgePosition === 'end' && badgeElement}
        {readStatusElement}
      </>
    );
  }

  const element = (
    <Ref innerRef={messageRef}>
      {getA11Props.unstable_wrapWithFocusZone(
        <ElementType
          {...getA11Props('root', {
            className: rootClasses,
            onBlur: handleBlur,
            onFocus: handleFocus,
            onMouseEnter: handleMouseEnter,
            ...rtlTextContainer.getAttributes({ forElements: [children] }),
            ...unhandledProps,
          })}
        >
          {childrenPropExists ? children : layout}
        </ElementType>,
      )}
    </Ref>
  );
  setEnd();

  return element;
};

ChatMessage.displayName = 'ChatMessage';

ChatMessage.defaultProps = {
  accessibility: chatMessageBehavior,
  badgePosition: 'end',
  compactBody: {},
  positionActionMenu: true,
  reactionGroupPosition: 'start',
};

ChatMessage.propTypes = {
  ...commonPropTypes.createCommon({ content: 'shorthand' }),
  actionMenu: PropTypes.oneOfType([customPropTypes.itemShorthand, customPropTypes.collectionShorthand]),
  attached: PropTypes.oneOfType([PropTypes.bool, PropTypes.oneOf<'top' | 'bottom'>(['top', 'bottom'])]),
  author: customPropTypes.itemShorthand,
  badge: customPropTypes.itemShorthand,
  badgePosition: PropTypes.oneOf(['start', 'end']),
  compact: PropTypes.bool,
  compactBody: customPropTypes.itemShorthand,
  details: customPropTypes.itemShorthand,
  header: customPropTypes.itemShorthand,
  mine: PropTypes.bool,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  onKeyDown: PropTypes.func,
  onMouseEnter: PropTypes.func,
  positionActionMenu: PropTypes.bool,
  reactionGroup: PropTypes.oneOfType([customPropTypes.collectionShorthand, customPropTypes.itemShorthand]),
  reactionGroupPosition: PropTypes.oneOf(['start', 'end']),
  readStatus: customPropTypes.itemShorthand,
  timestamp: customPropTypes.itemShorthand,
  unstable_overflow: PropTypes.bool,
};

ChatMessage.handledProps = Object.keys(ChatMessage.propTypes) as any;

ChatMessage.create = createShorthandFactory({ Component: ChatMessage, mappedProp: 'content' });
