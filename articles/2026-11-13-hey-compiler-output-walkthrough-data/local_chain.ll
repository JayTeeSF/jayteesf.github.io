; hey-mir-schema: 91bc59c5c4faf4ed6fd7aa78d3a3736f52cd0eac87b7273224dcc90736689f72
; hey-runtime-required: true
declare ptr @hey_llvm_int_literal_range_value(ptr, i64)
declare ptr @hey_llvm_value_clone_ptr(ptr)
declare ptr @hey_llvm_mul_value(ptr, ptr)
declare void @hey_llvm_release_value_ptr(ptr)
declare ptr @hey_llvm_add_value(ptr, ptr)
@hey_ir_const_u0_c0 = private constant [2 x i8] c"\32\00"
@hey_ir_const_u0_c1 = private constant [2 x i8] c"\33\00"
define ptr @hey_fn_u0_f0() {
entry:
  %s0 = alloca ptr
  %s1 = alloca ptr
  br label %b0
b0:
  %v0 = call ptr @hey_llvm_int_literal_range_value(ptr @hey_ir_const_u0_c0, i64 1)
  store ptr %v0, ptr %s0
  %borrow_1 = load ptr, ptr %s0
  %v1 = call ptr @hey_llvm_value_clone_ptr(ptr %borrow_1)
  %v2 = call ptr @hey_llvm_int_literal_range_value(ptr @hey_ir_const_u0_c1, i64 1)
  %v3 = call ptr @hey_llvm_mul_value(ptr %v1, ptr %v2)
  call void @hey_llvm_release_value_ptr(ptr %v1)
  call void @hey_llvm_release_value_ptr(ptr %v2)
  store ptr %v3, ptr %s1
  %borrow_4 = load ptr, ptr %s1
  %v4 = call ptr @hey_llvm_value_clone_ptr(ptr %borrow_4)
  %borrow_5 = load ptr, ptr %s0
  %v5 = call ptr @hey_llvm_value_clone_ptr(ptr %borrow_5)
  %v6 = call ptr @hey_llvm_add_value(ptr %v4, ptr %v5)
  call void @hey_llvm_release_value_ptr(ptr %v4)
  call void @hey_llvm_release_value_ptr(ptr %v5)
  %slot_drop_13 = load ptr, ptr %s1
  call void @hey_llvm_release_value_ptr(ptr %slot_drop_13)
  store ptr null, ptr %s1
  %slot_drop_14 = load ptr, ptr %s0
  call void @hey_llvm_release_value_ptr(ptr %slot_drop_14)
  store ptr null, ptr %s0
  ret ptr %v6
}
