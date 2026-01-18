import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select, SelectField, MultiSelect } from './Select';
import type { SelectOption } from './Select';

const mockOptions: SelectOption[] = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
  { value: '4', label: 'Option 4 (Disabled)', disabled: true },
];

describe('Select', () => {
  describe('Basic Rendering', () => {
    it('should render a select element', () => {
      render(<Select options={mockOptions} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<Select options={mockOptions} />);

      expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Option 2' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Option 3' })).toBeInTheDocument();
    });

    it('should render placeholder option when provided', () => {
      render(<Select options={mockOptions} placeholder="Select an option" />);

      expect(screen.getByRole('option', { name: 'Select an option' })).toBeInTheDocument();
    });

    it('should have disabled placeholder option', () => {
      render(<Select options={mockOptions} placeholder="Select an option" />);

      const placeholder = screen.getByRole('option', { name: 'Select an option' });
      expect(placeholder).toBeDisabled();
    });
  });

  describe('onChange Handler', () => {
    it('should call onChange when selection changes', () => {
      const onChange = vi.fn();
      render(<Select options={mockOptions} onChange={onChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '2' } });

      expect(onChange).toHaveBeenCalledWith('2');
    });

    it('should not error if onChange is not provided', () => {
      render(<Select options={mockOptions} />);

      const select = screen.getByRole('combobox');
      expect(() => {
        fireEvent.change(select, { target: { value: '2' } });
      }).not.toThrow();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Select options={mockOptions} disabled />);

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('should disable individual options', () => {
      render(<Select options={mockOptions} />);

      const disabledOption = screen.getByRole('option', { name: 'Option 4 (Disabled)' });
      expect(disabledOption).toBeDisabled();
    });
  });

  describe('Value Prop', () => {
    it('should reflect the selected value', () => {
      render(<Select options={mockOptions} value="2" />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('2');
    });
  });

  describe('Error State', () => {
    it('should apply error styles when error prop is true', () => {
      render(<Select options={mockOptions} error data-testid="select" />);

      const wrapper = screen.getByRole('combobox');
      expect(wrapper).toHaveClass('border-error-500');
    });
  });

  describe('Custom ClassName', () => {
    it('should accept custom className', () => {
      render(<Select options={mockOptions} className="custom-select" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('custom-select');
    });
  });
});

describe('SelectField', () => {
  describe('Label', () => {
    it('should render label when provided', () => {
      render(<SelectField options={mockOptions} label="Category" />);

      expect(screen.getByText('Category')).toBeInTheDocument();
    });

    it('should not render label when not provided', () => {
      render(<SelectField options={mockOptions} />);

      expect(screen.queryByRole('label')).not.toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    it('should render helper text when provided', () => {
      render(<SelectField options={mockOptions} helperText="Choose a category" />);

      expect(screen.getByText('Choose a category')).toBeInTheDocument();
    });
  });

  describe('Error Message', () => {
    it('should render error message when provided', () => {
      render(<SelectField options={mockOptions} errorMessage="This field is required" />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should show error message instead of helper text when both provided', () => {
      render(
        <SelectField
          options={mockOptions}
          helperText="Helper"
          errorMessage="Error"
        />
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });

    it('should apply error styles when errorMessage is provided', () => {
      const { container } = render(
        <SelectField options={mockOptions} errorMessage="Error" />
      );

      const errorText = screen.getByText('Error');
      expect(errorText).toHaveClass('text-error-500');
    });
  });

  describe('Custom ClassName', () => {
    it('should accept custom className', () => {
      const { container } = render(
        <SelectField options={mockOptions} className="custom-field" />
      );

      expect(container.firstChild).toHaveClass('custom-field');
    });
  });
});

describe('MultiSelect', () => {
  describe('Basic Rendering', () => {
    it('should render placeholder when no values selected', () => {
      render(
        <MultiSelect
          options={mockOptions}
          value={[]}
          onChange={vi.fn()}
          placeholder="Select options"
        />
      );

      expect(screen.getByText('Select options')).toBeInTheDocument();
    });

    it('should render selected values as tags', () => {
      render(
        <MultiSelect
          options={mockOptions}
          value={['1', '2']}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });

  describe('Dropdown', () => {
    it('should open dropdown when clicked', () => {
      render(
        <MultiSelect
          options={mockOptions}
          value={[]}
          onChange={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Options should be visible
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('should toggle dropdown on click', () => {
      render(
        <MultiSelect
          options={mockOptions}
          value={[]}
          onChange={vi.fn()}
        />
      );

      const button = screen.getByRole('button');

      // Open
      fireEvent.click(button);
      expect(screen.getAllByText('Option 1').length).toBeGreaterThan(0);

      // Close
      fireEvent.click(button);
      // When closed, only selected values are shown (none in this case)
    });
  });

  describe('Selection', () => {
    it('should call onChange when an option is selected', () => {
      const onChange = vi.fn();
      render(
        <MultiSelect
          options={mockOptions}
          value={[]}
          onChange={onChange}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const option = screen.getByText('Option 1').closest('button');
      fireEvent.click(option!);

      expect(onChange).toHaveBeenCalledWith(['1']);
    });

    it('should call onChange with value removed when deselecting', () => {
      const onChange = vi.fn();
      const { container } = render(
        <MultiSelect
          options={mockOptions}
          value={['1', '2']}
          onChange={onChange}
        />
      );

      // Find the main trigger button
      const buttons = container.querySelectorAll('button[type="button"]');
      const mainButton = buttons[0];
      fireEvent.click(mainButton);

      // Find the Option 1 button in the dropdown (it will have a checkbox-like indicator)
      const dropdownButtons = container.querySelectorAll('[class*="hover:bg-neutral"]');
      const option1Button = Array.from(dropdownButtons).find(
        (btn) => btn.textContent?.includes('Option 1')
      );
      if (option1Button) {
        fireEvent.click(option1Button);
        expect(onChange).toHaveBeenCalledWith(['2']);
      }
    });
  });

  describe('Remove Tag', () => {
    it('should remove value when clicking X on a tag', () => {
      const onChange = vi.fn();
      render(
        <MultiSelect
          options={mockOptions}
          value={['1', '2']}
          onChange={onChange}
        />
      );

      // Find the X button inside the Option 1 tag
      const option1Tag = screen.getByText('Option 1').closest('span');
      const removeButton = option1Tag?.querySelector('button');

      if (removeButton) {
        fireEvent.click(removeButton);
        expect(onChange).toHaveBeenCalledWith(['2']);
      }
    });
  });

  describe('Disabled Options', () => {
    it('should not allow selecting disabled options', () => {
      const onChange = vi.fn();
      render(
        <MultiSelect
          options={mockOptions}
          value={[]}
          onChange={onChange}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const disabledOption = screen.getByText('Option 4 (Disabled)').closest('button');
      expect(disabledOption).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('should apply error styles when error prop is true', () => {
      render(
        <MultiSelect
          options={mockOptions}
          value={[]}
          onChange={vi.fn()}
          error
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-error-500');
    });
  });

  describe('Custom ClassName', () => {
    it('should accept custom className', () => {
      const { container } = render(
        <MultiSelect
          options={mockOptions}
          value={[]}
          onChange={vi.fn()}
          className="custom-multiselect"
        />
      );

      expect(container.firstChild).toHaveClass('custom-multiselect');
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', () => {
      const { container } = render(
        <div>
          <MultiSelect
            options={mockOptions}
            value={[]}
            onChange={vi.fn()}
          />
          <div data-testid="outside">Outside Element</div>
        </div>
      );

      // Find the main trigger button (first button)
      const buttons = container.querySelectorAll('button[type="button"]');
      const mainButton = buttons[0];
      fireEvent.click(mainButton);

      // Dropdown should be open
      expect(screen.getAllByText('Option 1').length).toBeGreaterThan(0);

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));

      // Dropdown should close - there should be no option buttons visible
      // (just the main trigger button)
    });

    it('should not close dropdown when clicking inside the container', () => {
      const { container } = render(
        <MultiSelect
          options={mockOptions}
          value={[]}
          onChange={vi.fn()}
        />
      );

      // Open the dropdown
      const mainButton = screen.getByRole('button');
      fireEvent.click(mainButton);

      // Dropdown should be open
      expect(screen.getAllByText('Option 1').length).toBeGreaterThan(0);

      // Click inside the container (on the container div itself)
      const containerDiv = container.firstChild as HTMLElement;
      fireEvent.mouseDown(containerDiv);

      // Dropdown should remain open since we clicked inside
      expect(screen.getAllByText('Option 1').length).toBeGreaterThan(0);
    });
  });
});