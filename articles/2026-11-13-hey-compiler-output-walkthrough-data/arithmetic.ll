; hey-mir-schema: 91bc59c5c4faf4ed6fd7aa78d3a3736f52cd0eac87b7273224dcc90736689f72
; hey-runtime-required: false
define i64 @hey_fn_u0_f0() {
entry:
  br label %b0
b0:
  %v3 = mul i64 2, 3
  %v4 = add i64 1, %v3
  ret i64 %v4
}
