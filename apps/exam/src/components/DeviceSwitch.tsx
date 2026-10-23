type DeviceSwitchProps = {
    id: string;
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
};

export default function DeviceSwitch({ id, label, checked, onChange }: DeviceSwitchProps) {
    return (
        <div className="device-row">
            <span id={`${id}-label`} className="device-row__label">
                {label}
            </span>
            <button
                type="button"
                id={id}
                className="switch"
                role="switch"
                aria-checked={checked}
                aria-labelledby={`${id}-label`}
                onClick={() => onChange(!checked)}
            >
                <span className="switch__track">
                    <span className="switch__thumb" />
                </span>
                <span className={`switch__state${checked ? " switch__state--ready" : ""}`}>
                    {checked ? "Listo" : "Pendiente"}
                </span>
            </button>
        </div>
    );
}
