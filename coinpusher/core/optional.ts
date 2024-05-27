export type Optional<T,E> = {
    isSuccess: true,
    value: T
} | {
    isSuccess: false,
    error: E
}