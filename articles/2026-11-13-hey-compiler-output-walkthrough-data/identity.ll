; hey-mir-schema: 91bc59c5c4faf4ed6fd7aa78d3a3736f52cd0eac87b7273224dcc90736689f72
; hey-runtime-required: true
declare ptr @hey_llvm_value_clone_ptr(ptr)
define ptr @hey_fn_u0_f0(ptr %v0) {
entry:
  br label %b0
b0:
  %v1 = call ptr @hey_llvm_value_clone_ptr(ptr %v0)
  ret ptr %v1
}
