import Select from "../../components/ui/Select/Select";

function DoctorFilter({

    departments,

    value,

    onChange

}) {

    return (

        <Select
            label="Department"
            value={value}
            onChange={onChange}
            options={departments}
        />

    );

}

export default DoctorFilter;