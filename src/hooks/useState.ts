export function useState(value: any) {
    const state = ref(value)
    const setState = (value: any) => {
        state.value = value
    }
    return [state, setState]
}
