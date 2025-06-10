def outer_function():
    if condition1:
        print('Level 2')
    
    if condition2:
        for item in items:
            if item.valid:
                process(item)  # Esta debería ser la línea con máximo anidamiento (nivel 4)
                
    print('Back to level 1')
