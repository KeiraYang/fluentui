import { makeStyles, mergeClasses } from '@fluentui/react-make-styles';
import type { AccordionPanelState } from './AccordionPanel.types';

export const accordionPanelClassName = 'fui-AccordionPanel';

/**
 * Styles for the root slot
 */
const useStyles = makeStyles({
  root: {
    marginRight: '12px',
    marginLeft: '12px',
  },
});

/** Applies style classnames to slots */
export const useAccordionPanelStyles = (state: AccordionPanelState) => {
  const styles = useStyles();
  state.root.className = mergeClasses(accordionPanelClassName, styles.root, state.root.className);

  return state;
};
