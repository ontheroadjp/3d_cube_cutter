import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CuboidSettingsPanel, VertexLabelModal } from '../../js/ui/side_panel';

describe('SidePanel Components', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call __engine.configureCube when "Recreate Solid" is clicked', () => {
    const configureCubeMock = vi.fn();
    global.__engine = {
      configureCube: configureCubeMock,
      getCubeSize: () => ({ lx: 10, ly: 10, lz: 10 }),
    };

    render(React.createElement(CuboidSettingsPanel));

    const button = screen.getByText('立体図形を再作成');
    fireEvent.click(button);

    expect(configureCubeMock).toHaveBeenCalledWith(10, 10, 10);
  });

  it('should call __engine.configureVertexLabels when "Save" is clicked in modal', () => {
    const configureVertexLabelsMock = vi.fn();
    global.__engine = {
      configureVertexLabels: configureVertexLabelsMock,
      getVertexLabelMap: () => null,
    };

    const onClose = vi.fn();
    render(React.createElement(VertexLabelModal, { show: true, onClose }));

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    expect(configureVertexLabelsMock).toHaveBeenCalledWith(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    expect(onClose).toHaveBeenCalled();
  });
});
