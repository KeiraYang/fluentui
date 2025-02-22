import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Tab } from './Tab';
import { isConformant } from '../../common/isConformant';
import { TabListContext } from '../TabList/TabListContext';
import { TabListContextValue } from '../TabList/TabList.types';
import { CalendarMonth24Regular } from '@fluentui/react-icons';

describe('Tab', () => {
  isConformant({
    Component: Tab,
    displayName: 'Tab',
  });

  const defaultContext: TabListContextValue = {
    appearance: 'transparent',
    size: 'medium',
    vertical: false,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onSelect: () => {},
  };

  it.each([
    ['default', { ...defaultContext }],
    ['subtle appearance', { ...defaultContext, appearance: 'subtle' }],
    ['vertical', { ...defaultContext, vertical: true }],
    ['small size', { ...defaultContext, size: 'small' }],
    ['small size and vertical', { ...defaultContext, size: 'small', vertical: true }],
    ['selected', { ...defaultContext, selectedValue: '1' }],
    ['not selected', { ...defaultContext, selectedValue: '2' }],
  ])('renders %s correctly', (_testName, tabList) => {
    const contextValues = {
      tabList: tabList as TabListContextValue,
    };

    const result = render(
      <TabListContext.Provider value={contextValues.tabList}>
        <Tab value="1">Default Tab</Tab>
      </TabListContext.Provider>,
    );

    expect(result.container).toMatchSnapshot();
  });

  it('selected when clicked', () => {
    const onSelect = jest.fn();

    const contextValues = {
      tabList: { ...defaultContext, onSelect },
    };

    const result = render(
      <TabListContext.Provider value={contextValues.tabList}>
        <Tab value="1">Default Tab</Tab>
      </TabListContext.Provider>,
    );

    fireEvent.click(result.getByRole('tab'));
    expect(onSelect).toHaveBeenCalledWith(expect.anything(), { value: '1' });
  });

  it.each([
    ['default', { ...defaultContext }],
    ['subtle appearance', { ...defaultContext, appearance: 'subtle' }],
    ['vertical', { ...defaultContext, vertical: true }],
    ['small size', { ...defaultContext, size: 'small' }],
    ['small size and vertical', { ...defaultContext, size: 'small', vertical: true }],
  ])('renders %s correctly with icon slotted', (_testName, tabList) => {
    const contextValues = {
      tabList: tabList as TabListContextValue,
    };

    const result = render(
      <TabListContext.Provider value={contextValues.tabList}>
        <Tab icon={<CalendarMonth24Regular />} value="1">
          Default Tab
        </Tab>
      </TabListContext.Provider>,
    );

    expect(result.container).toMatchSnapshot();
  });
});
